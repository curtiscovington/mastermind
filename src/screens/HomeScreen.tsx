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
import Ring from '../components/Ring';
import ActionButton from '../components/ActionButton';
import './MastermindMockScreen.css';
import './HomeScreen.css';

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
    <div className="mm-frame home-frame" aria-label="Mastermind home">
      <header className="mm-top home-top">
        <div className="home-title">
          <h1>Mastermind</h1>
          <p className="home-subtitle">
            Patch into the lobby console to join an operation or deploy a new room.
          </p>
        </div>

        <dl className="home-meta" aria-label="Lobby settings">
          <div>
            <dt>Players</dt>
            <dd>
              {MIN_PLAYERS}–{MAX_PLAYERS}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Lobby ready</dd>
          </div>
        </dl>
      </header>

      <main className="mm-dashboard home-dashboard" aria-label="Lobby console">
        <Ring className="home-ring" showBackground clipContent>
          <div className="home-console">
          
            <h2>Join or deploy</h2>

            <form className="home-form" onSubmit={handleJoinRoom}>
              <label className="mml-field home-field">
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

              {error ? <p className="home-error">{error}</p> : null}

              <div className="home-actions">
                <ActionButton variant="green" type="submit" disabled={loading || joinCode.trim().length < 4}>
                  {loading ? 'Working…' : 'Join lobby'}
                </ActionButton>
                <span className="home-actions__or" aria-hidden>
                  or
                </span>
                <ActionButton variant="red" type="button" onClick={handleCreateRoom} disabled={loading}>
                  {loading ? 'Working…' : 'Create room'}
                </ActionButton>
              </div>
            </form>
          </div>
        </Ring>
      </main>
    </div>
  );
};

export default HomeScreen;
