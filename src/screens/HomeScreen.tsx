import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useClientIdContext } from '../contexts/ClientContext';
import { generateRoomCode } from '../utils/game';

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

const HomeScreen = () => {
  const clientId = useClientIdContext();
  const navigate = useNavigate();

  const [codename, setCodename] = useState('');
  const [joinCodename, setJoinCodename] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = generateRoomCode();
      const roomRef = await addDoc(collection(db, 'rooms'), {
        code,
        ownerClientId: clientId,
        status: 'lobby',
        phase: 'lobby',
        round: 0,
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS,
        directorCandidateId: null,
        deputyCandidateId: null,
        directorId: null,
        deputyId: null,
        previousDirectorId: null,
        voteTallies: {},
        instabilityCount: 0,
        autoEnactment: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'rooms', roomRef.id, 'players'), {
        clientId,
        displayName: codename.trim(),
        role: null,
        team: null,
        knownTeammateIds: [],
        alive: true,
        joinedAt: serverTimestamp(),
      });

      navigate(`/rooms/${roomRef.id}`);
    } catch (err) {
      console.error(err);
      setError('Unable to create room right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedCode = joinCode.trim().toUpperCase();
      const roomQuery = query(collection(db, 'rooms'), where('code', '==', formattedCode));
      const roomSnapshot = await getDocs(roomQuery);
      const roomDoc = roomSnapshot.docs.find((docSnap) => docSnap.data().status !== 'finished');

      if (!roomDoc) {
        setError('Room not found or already finished.');
        setLoading(false);
        return;
      }

      const roomId = roomDoc.id;
      const playersRef = collection(db, 'rooms', roomId, 'players');
      const existingPlayerQuery = query(playersRef, where('clientId', '==', clientId), limit(1));
      const existing = await getDocs(existingPlayerQuery);

      if (existing.empty) {
        await addDoc(playersRef, {
          clientId,
          displayName: joinCodename.trim(),
          role: null,
          team: null,
          knownTeammateIds: [],
          alive: true,
          joinedAt: serverTimestamp(),
        });
      } else {
        const playerDoc = existing.docs[0];
        if (playerDoc.data().displayName !== joinCodename.trim()) {
          await updateDoc(playerDoc.ref, { displayName: joinCodename.trim() });
        }
      }

      navigate(`/rooms/${roomId}`);
    } catch (err) {
      console.error(err);
      setError('Unable to join room right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <header className="hero">
        <p className="eyebrow">Party Game</p>
        <h1>The Mastermind</h1>
        <p className="lead">Create a room, share the code, and play together in person.</p>
      </header>

      <div className="card-grid">
        <form className="card" onSubmit={handleCreateRoom}>
          <div className="card-header">
          <h2>Create Room</h2>
          <p>Become the Owner and invite friends.</p>
          </div>
          <label className="field">
            <span>Codename (kept secret until the game begins)</span>
            <input
              type="text"
              placeholder="e.g. ShadowFox"
              value={codename}
              onChange={(e) => setCodename(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <button type="submit" className="primary" disabled={loading || !codename.trim()}>
            {loading ? 'Working…' : 'Create room'}
          </button>
        </form>

        <form className="card" onSubmit={handleJoinRoom}>
          <div className="card-header">
            <h2>Join Room</h2>
            <p>Enter a room code shared by your Owner.</p>
          </div>
          <label className="field">
            <span>Codename (kept secret until the game begins)</span>
            <input
              type="text"
              placeholder="e.g. NightOwl"
              value={joinCodename}
              onChange={(e) => setJoinCodename(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="field">
            <span>Room code</span>
            <input
              type="text"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              minLength={4}
              maxLength={6}
            />
          </label>
          <button
            type="submit"
            className="secondary"
            disabled={loading || !joinCodename.trim() || joinCode.trim().length < 4}
          >
            {loading ? 'Working…' : 'Join room'}
          </button>
        </form>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
};

export default HomeScreen;
