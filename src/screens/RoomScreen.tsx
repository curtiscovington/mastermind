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
import type { Player, PolicyCard, Room, SyndicatePower, Team, VoteChoice } from '../types';

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

type RoomStage = 'loading' | 'waiting' | 'countdown' | 'in_progress' | 'finished' | 'not_found';

const LoadingStage = () => (
  <div className="screen" role="status">
    <p className="muted">Loading room…</p>
  </div>
);

const MissingRoomStage = () => (
  <div className="screen">
    <p className="muted">Room not found.</p>
  </div>
);

const WaitingStage = ({
  room,
  players,
  clientId,
  onStartGame,
  starting,
}: {
  room: Room;
  players: Player[];
  clientId: string;
  onStartGame: () => Promise<void>;
  starting: boolean;
}) => (
  <LobbyScreen room={room} players={players} clientId={clientId} onStartGame={onStartGame} starting={starting} />
);

const ActiveStage = ({
  room,
  players,
  clientId,
  busyAction,
  handlers,
}: {
  room: Room;
  players: Player[];
  clientId: string;
  busyAction: string | null;
  handlers: {
    onNextRound: () => Promise<void>;
    onToggleAlive: (player: Player) => Promise<void>;
    onEndGame: () => Promise<void>;
    onNominateDeputy: (deputyId: string) => Promise<void>;
    onSubmitVote: (choice: VoteChoice) => Promise<void>;
    onDrawPolicies: () => Promise<void>;
    onDirectorDiscard: (cardIndex: number) => Promise<void>;
    onDeputyEnact: (cardIndex: number) => Promise<void>;
    onAutoEnactPolicy: () => Promise<void>;
    onInvestigatePlayer: (playerId: string) => Promise<void>;
    onUseSurveillance: () => Promise<void>;
    onSpecialElection: (directorId: string) => Promise<void>;
    onPurgePlayer: (playerId: string) => Promise<void>;
  };
}) => (
  <GameScreen
    room={room}
    players={players}
    clientId={clientId}
    onNextRound={handlers.onNextRound}
    onToggleAlive={handlers.onToggleAlive}
    onEndGame={handlers.onEndGame}
    onNominateDeputy={handlers.onNominateDeputy}
    onSubmitVote={handlers.onSubmitVote}
    onDrawPolicies={handlers.onDrawPolicies}
    onDirectorDiscard={handlers.onDirectorDiscard}
    onDeputyEnact={handlers.onDeputyEnact}
    onAutoEnactPolicy={handlers.onAutoEnactPolicy}
    onInvestigatePlayer={handlers.onInvestigatePlayer}
    onUseSurveillance={handlers.onUseSurveillance}
    onSpecialElection={handlers.onSpecialElection}
    onPurgePlayer={handlers.onPurgePlayer}
    busyAction={busyAction}
  />
);

const ResultsStage = ({ room, players }: { room: Room; players: Player[] }) => {
  const syndicateEnacted = room.syndicatePoliciesEnacted ?? 0;
  const agencyEnacted = room.agencyPoliciesEnacted ?? 0;
  const survivingPlayers = players.filter((player) => player.alive);
  const eliminatedPlayers = players.filter((player) => !player.alive);

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Room {room.code}</p>
          <h1>Game finished</h1>
          <p className="muted">Review the outcome and restart if you want another round.</p>
        </div>
        <div className="badge">Finished</div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Policy Summary</h2>
          <span className="pill neutral">Round {room.round}</span>
        </div>
        <ul className="list">
          <li className="list-row">
            <div>
              <p className="list-title">Syndicate Policies Enacted</p>
              <p className="muted">Progress toward Mastermind victory.</p>
            </div>
            <span className="pill danger">{syndicateEnacted} / 6</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Agency Policies Enacted</p>
              <p className="muted">Progress toward Agency victory.</p>
            </div>
            <span className="pill success">{agencyEnacted} / 6</span>
          </li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Players</h2>
          <span className="pill neutral">Status at end</span>
        </div>
        <div className="card-grid">
          <div className="stack">
            <p className="muted">Survivors</p>
            {survivingPlayers.length ? (
              <ul className="list">
                {survivingPlayers.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{player.role ?? 'Unknown role'}</p>
                    </div>
                    <span className="pill success">Alive</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No survivors this round.</p>
            )}
          </div>

          <div className="stack">
            <p className="muted">Eliminated</p>
            {eliminatedPlayers.length ? (
              <ul className="list">
                {eliminatedPlayers.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{player.role ?? 'Unknown role'}</p>
                    </div>
                    <span className="pill danger">Eliminated</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No one was eliminated.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

  const stage: RoomStage = useMemo(() => {
    if (roomLoading || playersLoading) return 'loading';
    if (!room) return 'not_found';
    if (room.status === 'finished' || room.phase === 'finished') return 'finished';
    if (room.status === 'lobby') return busy === 'start' ? 'countdown' : 'waiting';
    return 'in_progress';
  }, [busy, playersLoading, room, roomLoading]);

  if (!roomId) {
    return <Navigate to="/" replace />;
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

  const handlers = {
    onNextRound: handleNextRound,
    onToggleAlive: handleToggleAlive,
    onEndGame: handleEndGame,
    onNominateDeputy: handleNominateDeputy,
    onSubmitVote: handleSubmitVote,
    onDrawPolicies: handleDrawPolicies,
    onDirectorDiscard: handleDirectorDiscard,
    onDeputyEnact: handleDeputyEnact,
    onAutoEnactPolicy: handleAutoEnactPolicy,
    onInvestigatePlayer: handleInvestigatePlayer,
    onUseSurveillance: handleSurveillance,
    onSpecialElection: handleSpecialElection,
    onPurgePlayer: handlePurgePlayer,
  };

  let content: ReactElement | null = null;

  switch (stage) {
    case 'loading':
      content = <LoadingStage />;
      break;
    case 'not_found':
      content = <MissingRoomStage />;
      break;
    case 'waiting':
    case 'countdown':
      content = (
        <WaitingStage
          room={room as Room}
          players={visiblePlayers}
          clientId={clientId}
          onStartGame={handleStartGame}
          starting={busy === 'start'}
        />
      );
      break;
    case 'finished':
      content = <ResultsStage room={room as Room} players={visiblePlayers} />;
      break;
    case 'in_progress':
    default:
      content = (
        <ActiveStage
          room={room as Room}
          players={visiblePlayers}
          clientId={clientId}
          busyAction={busy}
          handlers={handlers}
        />
      );
  }

  return <div className="room-shell">{content}</div>;
};

export default RoomScreen;
