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
import type { Player } from '../types';

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

      assignments.forEach(({ playerId, role }) => {
        const playerRef = doc(db, 'rooms', room.id, 'players', playerId);
        batch.update(playerRef, { role, alive: true });
      });

      batch.update(roomRef, {
        status: 'in_progress',
        phase: 'in_progress',
        round: 1,
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
      await updateDoc(roomRef, { round: increment(1), updatedAt: serverTimestamp() });
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
      busyAction={busy}
    />
  );
};

export default RoomScreen;
