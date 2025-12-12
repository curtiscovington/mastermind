import {
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { useClientIdContext } from '../contexts/ClientContext';
import { usePlayers, useRoom } from '../hooks/useRoomData';
import LobbyScreen from './LobbyScreen';
import GameScreen from './GameScreen';
import { assignRolesToPlayers, buildPolicyDeck, drawPolicyCards, getUnlockedSyndicatePowers } from '../utils/game';
import type { Player, PolicyCard, SyndicatePower, Team, VoteChoice } from '../types';

const shufflePlayers = (players: Player[], seed: string) => {
  if (!seed) return players;

  let rngSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...players];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    rngSeed = Math.sin(rngSeed + i) * 10000;
    const j = Math.abs(Math.floor(rngSeed)) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

const getNextDirectorCandidate = (
  currentDirectorId: string | null,
  roster: Player[],
): string | null => {
  const alivePlayers = roster.filter((player) => player.alive);
  if (!alivePlayers.length) return null;

  if (!currentDirectorId) {
    return alivePlayers[0]?.id ?? null;
  }

  const currentIndex = alivePlayers.findIndex((player) => player.id === currentDirectorId);
  if (currentIndex === -1) {
    return alivePlayers[0]?.id ?? null;
  }

  const nextIndex = (currentIndex + 1) % alivePlayers.length;
  return alivePlayers[nextIndex]?.id ?? null;
};

const RoomScreen = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const clientId = useClientIdContext();
  const { room, loading: roomLoading } = useRoom(roomId ?? '');
  const { players: roster, loading: playersLoading } = usePlayers(roomId ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const isFinished = room?.status === 'finished';

  const isOwner = useMemo(
    () => (room ? room.ownerClientId === clientId : false),
    [clientId, room],
  );

  const you = useMemo(
    () => roster.find((player) => player.clientId === clientId),
    [clientId, roster],
  );

  const visiblePlayers = useMemo(
    () => (room ? shufflePlayers(roster, room.id) : roster),
    [roster, room],
  );

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  let content: ReactElement | null = null;

  if (roomLoading || playersLoading) {
    content = (
      <div className="screen">
        <p className="muted">Loading room…</p>
      </div>
    );
  } else if (!room) {
    content = (
      <div className="screen">
        <p className="muted">Room not found.</p>
      </div>
    );
  }

  const handleStartGame = async () => {
    if (!room || !isOwner || roster.length === 0 || isFinished) return;
    setBusy('start');

    try {
      const assignments = assignRolesToPlayers(roster);
      const batch = writeBatch(db);
      const roomRef = doc(db, 'rooms', room.id);
      const firstDirectorCandidate = getNextDirectorCandidate(null, roster);

      assignments.forEach(({ playerId, role, team, knownTeammateIds }) => {
        const playerRef = doc(db, 'rooms', room.id, 'players', playerId);
        batch.update(playerRef, { role, team, knownTeammateIds, alive: true });
      });

      batch.update(roomRef, {
        status: 'in_progress',
        phase: 'nomination',
        round: 1,
        directorCandidateId: firstDirectorCandidate,
        deputyCandidateId: null,
        directorId: null,
        deputyId: null,
        previousDirectorId: null,
        voteTallies: {},
        instabilityCount: 0,
        autoEnactment: false,
        policyDeck: buildPolicyDeck(),
        policyDiscard: [],
        directorHand: [],
        deputyHand: [],
        syndicatePoliciesEnacted: 0,
        agencyPoliciesEnacted: 0,
        syndicatePowersResolved: [],
        investigationResults: {},
        surveillancePeek: [],
        specialElectionDirectorId: null,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleNextRound = async () => {
    if (!room || !isOwner || isFinished) return;
    setBusy('round');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const specialElectionTarget =
        room.specialElectionDirectorId &&
        roster.some((player) => player.id === room.specialElectionDirectorId && player.alive)
          ? room.specialElectionDirectorId
          : null;
      const nextDirectorCandidate = getNextDirectorCandidate(
        specialElectionTarget ?? room.directorCandidateId ?? room.directorId ?? null,
        roster,
      );
      await updateDoc(roomRef, {
        round: increment(1),
        phase: 'nomination',
        directorCandidateId: specialElectionTarget ?? nextDirectorCandidate,
        deputyCandidateId: null,
        directorId: null,
        deputyId: null,
        previousDirectorId: room.directorId ?? room.directorCandidateId ?? null,
        voteTallies: {},
        instabilityCount: room.instabilityCount ?? 0,
        autoEnactment: false,
        directorHand: [],
        deputyHand: [],
        specialElectionDirectorId: null,
        surveillancePeek: [],
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleAlive = async (player: Player) => {
    if (!room || !isOwner || isFinished) return;
    setBusy(player.id);

    try {
      const playerRef = doc(db, 'rooms', room.id, 'players', player.id);
      await updateDoc(playerRef, { alive: !player.alive, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleNominateDeputy = async (deputyId: string) => {
    if (!room || !you || you.id !== room.directorCandidateId || isFinished) return;
    setBusy('nominate');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        deputyCandidateId: deputyId,
        voteTallies: {},
        phase: 'voting',
        autoEnactment: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleSubmitVote = async (choice: VoteChoice) => {
    if (!room || !you || !you.alive || room.phase !== 'voting' || isFinished) return;
    setBusy('vote');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const existingTallies = (roomData.voteTallies ?? {}) as Record<string, VoteChoice>;
        const updatedTallies = { ...existingTallies, [you.id]: choice };
        const alivePlayers = roster.filter((player) => player.alive);
        const approvals = Object.values(updatedTallies).filter((vote) => vote === 'approve').length;
        const rejections = Object.values(updatedTallies).filter((vote) => vote === 'reject').length;
        const majority = Math.floor(alivePlayers.length / 2) + 1;

        const updates: Record<string, unknown> = {
          voteTallies: updatedTallies,
          updatedAt: serverTimestamp(),
        };

        if (approvals >= majority) {
          updates.phase = 'enactment';
          updates.directorId = room.directorCandidateId ?? null;
          updates.deputyId = room.deputyCandidateId ?? null;
          updates.previousDirectorId = room.directorCandidateId ?? room.directorId ?? null;
          updates.instabilityCount = 0;
          updates.autoEnactment = false;
          updates.directorHand = [];
          updates.deputyHand = [];

          if (
            roomData.syndicatePoliciesEnacted >= 3 &&
            roomData.deputyCandidateId
          ) {
            const deputyRef = doc(db, 'rooms', room.id, 'players', roomData.deputyCandidateId);
            const deputySnap = await transaction.get(deputyRef);

            if (deputySnap.exists()) {
              const deputyData = deputySnap.data() as Player;
              if (deputyData.role === 'mastermind') {
                updates.status = 'finished';
                updates.phase = 'finished';
              }
            }
          }
        } else if (
          rejections >= majority ||
          Object.keys(updatedTallies).length >= alivePlayers.length
        ) {
          const newInstability = (room.instabilityCount ?? 0) + 1;
          const reachedChaos = newInstability >= 3;
          const nextDirectorCandidate = getNextDirectorCandidate(
            room.directorCandidateId ?? room.directorId ?? null,
            roster,
          );

          updates.phase = reachedChaos ? 'enactment' : 'nomination';
          updates.directorCandidateId = nextDirectorCandidate;
          updates.deputyCandidateId = null;
          updates.previousDirectorId = room.directorCandidateId ?? room.directorId ?? null;
          updates.voteTallies = {};
          updates.instabilityCount = reachedChaos ? 0 : newInstability;
          updates.autoEnactment = reachedChaos;
          updates.directorId = null;
          updates.deputyId = null;
          updates.directorHand = [];
          updates.deputyHand = [];
        }

        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleDrawPolicies = async () => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy('draw');

    try {
      const roomRef = doc(db, 'rooms', room.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        if (roomData.autoEnactment) return;

        const directorHand = (roomData.directorHand ?? []) as PolicyCard[];
        if (directorHand.length) return;

        const deck = (roomData.policyDeck ?? []) as PolicyCard[];
        const discard = (roomData.policyDiscard ?? []) as PolicyCard[];
        const { drawn, deck: remainingDeck, discard: remainingDiscard } = drawPolicyCards(deck, discard, 3);

        if (drawn.length < 3) return;

        transaction.update(roomRef, {
          policyDeck: remainingDeck,
          policyDiscard: remainingDiscard,
          directorHand: drawn,
          deputyHand: [],
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleDirectorDiscard = async (cardIndex: number) => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy(`director-discard-${cardIndex}`);

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        if (roomData.autoEnactment) return;

        const directorHand = (roomData.directorHand ?? []) as PolicyCard[];
        const discardPile = (roomData.policyDiscard ?? []) as PolicyCard[];

        if (directorHand.length !== 3 || !directorHand[cardIndex]) return;

        const discarded = directorHand[cardIndex];
        const remainingForDeputy = directorHand.filter((_, idx) => idx !== cardIndex);

        transaction.update(roomRef, {
          directorHand: [],
          deputyHand: remainingForDeputy,
          policyDiscard: [...discardPile, discarded],
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleDeputyEnact = async (cardIndex: number) => {
    if (!room || !you || you.id !== room.deputyId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy(`deputy-enact-${cardIndex}`);

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const deputyHand = (roomData.deputyHand ?? []) as PolicyCard[];
        const discardPile = (roomData.policyDiscard ?? []) as PolicyCard[];

        if (deputyHand.length !== 2 || !deputyHand[cardIndex]) return;

        const enacted = deputyHand[cardIndex];
        const discarded = deputyHand[cardIndex === 0 ? 1 : 0];

        const updatedSyndicatePolicies =
          enacted === 'syndicate'
            ? (roomData.syndicatePoliciesEnacted ?? 0) + 1
            : roomData.syndicatePoliciesEnacted ?? 0;
        const updatedAgencyPolicies =
          enacted === 'agency'
            ? (roomData.agencyPoliciesEnacted ?? 0) + 1
            : roomData.agencyPoliciesEnacted ?? 0;

        const updates: Record<string, unknown> = {
          deputyHand: [],
          directorHand: [],
          policyDiscard: [...discardPile, discarded],
          syndicatePoliciesEnacted: updatedSyndicatePolicies,
          agencyPoliciesEnacted: updatedAgencyPolicies,
          autoEnactment: false,
          updatedAt: serverTimestamp(),

          ...(updatedAgencyPolicies >= 5 || updatedSyndicatePolicies >= 6
            ? { status: 'finished', phase: 'finished' }
            : {}),
        };

        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleInvestigatePlayer = async (playerId: string) => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy(`investigate-${playerId}`);

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const targetRef = doc(db, 'rooms', room.id, 'players', playerId);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const unlockedPowers = getUnlockedSyndicatePowers(roomData.syndicatePoliciesEnacted ?? 0);
        const resolvedPowers = (roomData.syndicatePowersResolved ?? []) as SyndicatePower[];

        if (!unlockedPowers.includes('investigate') || resolvedPowers.includes('investigate')) return;

        const targetSnap = await transaction.get(targetRef);

        if (!targetSnap.exists()) {
          throw new Error('Player not found');
        }

        const targetData = targetSnap.data() as Player;
        const results = (roomData.investigationResults ?? {}) as Record<string, Team>;
        const updatedResolved = Array.from(new Set<SyndicatePower>([...resolvedPowers, 'investigate']));

        transaction.update(roomRef, {
          investigationResults: { ...results, [playerId]: targetData.team ?? null },
          syndicatePowersResolved: updatedResolved,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleSurveillance = async () => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy('surveillance');

    try {
      const roomRef = doc(db, 'rooms', room.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const unlockedPowers = getUnlockedSyndicatePowers(roomData.syndicatePoliciesEnacted ?? 0);
        const resolvedPowers = (roomData.syndicatePowersResolved ?? []) as SyndicatePower[];

        if (!unlockedPowers.includes('surveillance') || resolvedPowers.includes('surveillance')) return;

        const deck = (roomData.policyDeck ?? []) as PolicyCard[];
        const discard = (roomData.policyDiscard ?? []) as PolicyCard[];
        const availableDeck = deck.length >= 3 ? deck : [...deck, ...discard];
        const peek = availableDeck.slice(0, 3);
        const updatedResolved = Array.from(new Set<SyndicatePower>([...resolvedPowers, 'surveillance']));

        transaction.update(roomRef, {
          surveillancePeek: peek,
          syndicatePowersResolved: updatedResolved,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleSpecialElection = async (directorId: string) => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy(`special-election-${directorId}`);

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const targetRef = doc(db, 'rooms', room.id, 'players', directorId);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const unlockedPowers = getUnlockedSyndicatePowers(roomData.syndicatePoliciesEnacted ?? 0);
        const resolvedPowers = (roomData.syndicatePowersResolved ?? []) as SyndicatePower[];

        if (!unlockedPowers.includes('special_election') || resolvedPowers.includes('special_election')) return;

        const targetSnap = await transaction.get(targetRef);

        if (!targetSnap.exists()) {
          throw new Error('Player not found');
        }

        const targetData = targetSnap.data() as Player;
        if (!targetData.alive) return;

        const updatedResolved = Array.from(
          new Set<SyndicatePower>([...resolvedPowers, 'special_election']),
        );

        transaction.update(roomRef, {
          specialElectionDirectorId: directorId,
          syndicatePowersResolved: updatedResolved,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handlePurgePlayer = async (playerId: string) => {
    if (!room || !you || you.id !== room.directorId || room.phase !== 'enactment' || isFinished)
      return;
    setBusy(`purge-${playerId}`);

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const targetRef = doc(db, 'rooms', room.id, 'players', playerId);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        const unlockedPowers = getUnlockedSyndicatePowers(roomData.syndicatePoliciesEnacted ?? 0);
        const resolvedPowers = (roomData.syndicatePowersResolved ?? []) as SyndicatePower[];

        if (!unlockedPowers.includes('purge') || resolvedPowers.includes('purge')) return;

        const targetSnap = await transaction.get(targetRef);

        if (!targetSnap.exists()) {
          throw new Error('Player not found');
        }

        const targetData = targetSnap.data() as Player;
        if (!targetData.alive) return;

        const updatedResolved = Array.from(new Set<SyndicatePower>([...resolvedPowers, 'purge']));

        const updates: Record<string, unknown> = {
          syndicatePowersResolved: updatedResolved,
          updatedAt: serverTimestamp(),
        };

        transaction.update(targetRef, { alive: false, updatedAt: serverTimestamp() });

        if (targetData.role === 'mastermind') {
          updates.status = 'finished';
          updates.phase = 'finished';
        }

        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleAutoEnactPolicy = async () => {
    if (!room || !isOwner || room.phase !== 'enactment' || !room.autoEnactment || isFinished)
      return;
    setBusy('auto-enact');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);

        if (!snapshot.exists()) {
          throw new Error('Room not found');
        }

        const roomData = snapshot.data();
        if (!roomData.autoEnactment) return;

        const deck = (roomData.policyDeck ?? []) as PolicyCard[];
        const discard = (roomData.policyDiscard ?? []) as PolicyCard[];
        const { drawn, deck: remainingDeck, discard: remainingDiscard } = drawPolicyCards(deck, discard, 1);
        const enacted = drawn[0];

        if (!enacted) return;

        const updatedSyndicatePolicies =
          enacted === 'syndicate'
            ? (roomData.syndicatePoliciesEnacted ?? 0) + 1
            : roomData.syndicatePoliciesEnacted ?? 0;
        const updatedAgencyPolicies =
          enacted === 'agency'
            ? (roomData.agencyPoliciesEnacted ?? 0) + 1
            : roomData.agencyPoliciesEnacted ?? 0;

        const updates: Record<string, unknown> = {
          policyDeck: remainingDeck,
          policyDiscard: remainingDiscard,
          syndicatePoliciesEnacted: updatedSyndicatePolicies,
          agencyPoliciesEnacted: updatedAgencyPolicies,
          deputyHand: [],
          directorHand: [],
          autoEnactment: false,
          updatedAt: serverTimestamp(),

          ...(updatedAgencyPolicies >= 5 || updatedSyndicatePolicies >= 6
            ? { status: 'finished', phase: 'finished' }
            : {}),
        };

        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleEndGame = async () => {
    if (!room || !isOwner || isFinished) return;
    setBusy('end');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        status: 'finished',
        phase: 'finished',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  if (!content) {
    content =
      room.status === 'lobby' ? (
        <LobbyScreen
          room={room}
          players={visiblePlayers}
          clientId={clientId}
          onStartGame={handleStartGame}
          starting={busy === 'start'}
        />
      ) : (
        <GameScreen
          room={room}
          players={visiblePlayers}
          clientId={clientId}
          onNextRound={handleNextRound}
          onToggleAlive={handleToggleAlive}
          onEndGame={handleEndGame}
          onNominateDeputy={handleNominateDeputy}
          onSubmitVote={handleSubmitVote}
          onDrawPolicies={handleDrawPolicies}
          onDirectorDiscard={handleDirectorDiscard}
          onDeputyEnact={handleDeputyEnact}
          onAutoEnactPolicy={handleAutoEnactPolicy}
          onInvestigatePlayer={handleInvestigatePlayer}
          onUseSurveillance={handleSurveillance}
          onSpecialElection={handleSpecialElection}
          onPurgePlayer={handlePurgePlayer}
          busyAction={busy}
        />
      );
  }

  return <div className="room-shell">{content}</div>;
};

export default RoomScreen;
