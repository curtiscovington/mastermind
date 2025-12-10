export type GameStatus = 'lobby' | 'in_progress' | 'finished';

export type Role = 'mastermind' | 'agent' | 'civilian' | null;

export interface Room {
  id: string;
  code: string;
  ownerClientId: string;
  status: GameStatus;
  phase: GameStatus;
  round: number;
  minPlayers?: number;
  maxPlayers?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Player {
  id: string;
  clientId: string;
  displayName: string;
  role: Role;
  alive: boolean;
  joinedAt?: unknown;
}
