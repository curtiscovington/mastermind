export type GameStatus = 'lobby' | 'in_progress' | 'finished';

export type GamePhase = 'lobby' | 'nomination' | 'voting' | 'enactment' | 'finished';

export type Role = 'mastermind' | 'syndicate_agent' | 'agency' | null;

export type Team = 'syndicate' | 'agency' | null;

export type VoteChoice = 'approve' | 'reject';

export type VoteTallies = Record<string, VoteChoice>;

export interface Room {
  id: string;
  code: string;
  ownerClientId: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  minPlayers?: number;
  maxPlayers?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  directorCandidateId?: string | null;
  deputyCandidateId?: string | null;
  directorId?: string | null;
  deputyId?: string | null;
  previousDirectorId?: string | null;
  voteTallies?: VoteTallies;
  instabilityCount?: number;
  autoEnactment?: boolean;
}

export interface Player {
  id: string;
  clientId: string;
  displayName: string;
  role: Role;
  team: Team;
  knownTeammateIds?: string[];
  alive: boolean;
  joinedAt?: unknown;
}
