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

  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
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
        displayName: '',
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
          displayName: '',
          role: null,
          team: null,
          knownTeammateIds: [],
          alive: true,
          joinedAt: serverTimestamp(),
        });
      } else {
        const playerDoc = existing.docs[0];
        await updateDoc(playerDoc.ref, { displayName: playerDoc.data().displayName ?? '' });
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
    <div className="screen home-screen">
      <header className="home-header">
        <div>
          <h1>Mastermind</h1>
          <p className="home-intro">Join with a code or host a lobby for your crew.</p>
        </div>
      </header>

      <form className="home-panel" onSubmit={handleJoinRoom}>
        <div className="home-panel__head">
          <div>
            <h2>Jump into a lobby</h2>
            <p className="home-panel__hint">
              Enter a room code to join your crew or spin up a new lobby in one click. You&apos;ll set a codename in the lobby.
            </p>
          </div>
        </div>

        <div className="home-fields">
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
        </div>

        <div className="home-panel__actions">
          <button
            type="submit"
            className="primary"
            disabled={loading || joinCode.trim().length < 4}
          >
            {loading ? 'Working…' : 'Join'}
          </button>
          <span className="home-panel__or">or</span>
          <button type="button" className="secondary" onClick={handleCreateRoom} disabled={loading}>
            {loading ? 'Working…' : 'Create room'}
          </button>
        </div>
      </form>

      {error ? <p className="error home-error">{error}</p> : null}
    </div>
  );
};

export default HomeScreen;
