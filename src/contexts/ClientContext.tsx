import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const ClientIdContext = createContext<string | null>(null);

export const ClientIdProvider = ({
  clientId,
  children,
}: {
  clientId: string;
  children: ReactNode;
}) => {
  return <ClientIdContext.Provider value={clientId}>{children}</ClientIdContext.Provider>;
};

export const useClientIdContext = () => {
  const context = useContext(ClientIdContext);

  if (!context) {
    throw new Error('ClientIdContext not available');
  }

  return context;
};
