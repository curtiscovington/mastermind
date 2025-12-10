import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import type { Player, Room } from '../types';

export const useRoom = (roomId: string) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom({ id: snapshot.id, ...(snapshot.data() as Omit<Room, 'id'>) });
        } else {
          setRoom(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [roomId]);

  return { room, loading };
};

export const usePlayers = (roomId: string) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Player[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...(docSnap.data() as Omit<Player, 'id'>) });
        });
        setPlayers(data);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [roomId]);

  return { players, loading };
};
