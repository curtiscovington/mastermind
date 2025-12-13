const STORAGE_KEY = 'mastermindClientId';
let cachedId: string | null = null;

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const getStoredId = () => {
  if (typeof window === 'undefined') return null;

  let stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    stored = createId();
    window.localStorage.setItem(STORAGE_KEY, stored);
  }

  return stored;
};

export const useClientId = () => {
  if (!cachedId) {
    cachedId = getStoredId();
  }

  return cachedId;
};
