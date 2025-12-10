import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mastermindClientId';

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export const useClientId = () => {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      stored = createId();
      window.localStorage.setItem(STORAGE_KEY, stored);
    }

    setClientId(stored);
  }, []);

  return clientId;
};
