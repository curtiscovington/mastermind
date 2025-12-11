import {
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { useClientIdContext } from '../contexts/ClientContext';
import { usePlayers, useRoom } from '../hooks/useRoomData';
import LobbyScreen from './LobbyScreen';
import GameScreen from './GameScreen';
import { assignRolesToPlayers } from '../utils/game';
import type { Player, VoteChoice } from '../types';

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
  const { players, loading: playersLoading } = usePlayers(roomId ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const isOwner = useMemo(
    () => (room ? room.ownerClientId === clientId : false),
    [clientId, room],
  );

  const you = useMemo(
    () => players.find((player) => player.clientId === clientId),
    [clientId, players],
  );

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  if (roomLoading || playersLoading) {
    return (
      <div className="screen">
        <p className="muted">Loading room…</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="screen">
        <p className="muted">Room not found.</p>
      </div>
    );
  }

  const handleStartGame = async () => {
    if (!room || !isOwner || players.length === 0) return;
    setBusy('start');

    try {
      const assignments = assignRolesToPlayers(players);
      const batch = writeBatch(db);
      const roomRef = doc(db, 'rooms', room.id);
      const firstDirectorCandidate = getNextDirectorCandidate(null, players);

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
    if (!room || !isOwner) return;
    setBusy('round');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const nextDirectorCandidate = getNextDirectorCandidate(
        room.directorCandidateId ?? room.directorId ?? null,
        players,
      );
      await updateDoc(roomRef, {
        round: increment(1),
        phase: 'nomination',
        directorCandidateId: nextDirectorCandidate,
        deputyCandidateId: null,
        directorId: null,
        deputyId: null,
        previousDirectorId: room.directorId ?? room.directorCandidateId ?? null,
        voteTallies: {},
        instabilityCount: room.instabilityCount ?? 0,
        autoEnactment: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleAlive = async (player: Player) => {
    if (!room || !isOwner) return;
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
    if (!room || !you || you.id !== room.directorCandidateId) return;
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
    if (!room || !you || !you.alive || room.phase !== 'voting') return;
    setBusy('vote');

    try {
      const roomRef = doc(db, 'rooms', room.id);
      const updatedTallies = { ...(room.voteTallies ?? {}), [you.id]: choice };
      const alivePlayers = players.filter((player) => player.alive);
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
      } else if (rejections >= majority || Object.keys(updatedTallies).length >= alivePlayers.length) {
        const newInstability = (room.instabilityCount ?? 0) + 1;
        const reachedChaos = newInstability >= 3;
        const nextDirectorCandidate = getNextDirectorCandidate(
          room.directorCandidateId ?? room.directorId ?? null,
          players,
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
      }

      await updateDoc(roomRef, updates);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleEndGame = async () => {
    if (!room || !isOwner) return;
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

  if (room.status === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        players={players}
        clientId={clientId}
        onStartGame={handleStartGame}
        starting={busy === 'start'}
      />
    );
  }

  return (
    <GameScreen
      room={room}
      players={players}
      clientId={clientId}
      onNextRound={handleNextRound}
      onToggleAlive={handleToggleAlive}
      onEndGame={handleEndGame}
      onNominateDeputy={handleNominateDeputy}
      onSubmitVote={handleSubmitVote}
      busyAction={busy}
    />
  );
};

export default RoomScreen;
