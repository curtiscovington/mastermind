import type { Player, Room } from '../types';
import { buildPolicyDeck } from '../utils/game';

const playerRoster: Player[] = [
  {
    id: 'player-1',
    clientId: 'client-1',
    displayName: 'Cipher',
    role: 'agency',
    team: 'agency',
    alive: true,
  },
  {
    id: 'player-2',
    clientId: 'client-2',
    displayName: 'NightOwl',
    role: 'agency',
    team: 'agency',
    alive: true,
  },
  {
    id: 'player-3',
    clientId: 'client-3',
    displayName: 'Shade',
    role: 'mastermind',
    team: 'syndicate',
    knownTeammateIds: ['player-4'],
    alive: true,
  },
  {
    id: 'player-4',
    clientId: 'client-4',
    displayName: 'Specter',
    role: 'syndicate_agent',
    team: 'syndicate',
    knownTeammateIds: ['player-3'],
    alive: true,
  },
  {
    id: 'player-5',
    clientId: 'client-5',
    displayName: 'Beacon',
    role: 'agency',
    team: 'agency',
    alive: false,
  },
  {
    id: 'player-6',
    clientId: 'client-6',
    displayName: 'Vesper',
    role: 'syndicate_agent',
    team: 'syndicate',
    alive: true,
  },
  {
    id: 'player-7',
    clientId: 'client-7',
    displayName: 'Harbor',
    role: 'agency',
    team: 'agency',
    alive: true,
  },
];

const lobbyPlayers: Player[] = playerRoster.map((player) => ({
  ...player,
  role: null,
  team: null,
  knownTeammateIds: [],
  alive: true,
}));

const baseRoom: Room = {
  id: 'local-room',
  code: 'LOCAL1',
  ownerClientId: 'client-1',
  status: 'lobby',
  phase: 'lobby',
  round: 0,
  minPlayers: 5,
  maxPlayers: 10,
};

const activeRoomBase: Room = {
  ...baseRoom,
  status: 'in_progress',
  phase: 'nomination',
  round: 2,
  voteTallies: {},
  instabilityCount: 1,
  syndicatePoliciesEnacted: 2,
  agencyPoliciesEnacted: 1,
  policyDeck: buildPolicyDeck(),
  policyDiscard: ['agency', 'syndicate'],
  syndicatePowersResolved: ['investigate'],
};

const nominationRoom: Room = {
  ...activeRoomBase,
  directorCandidateId: 'player-6',
  previousDirectorId: 'player-2',
};

const votingRoom: Room = {
  ...activeRoomBase,
  phase: 'voting',
  directorCandidateId: 'player-6',
  deputyCandidateId: 'player-4',
  voteTallies: {
    'player-1': 'approve',
    'player-2': 'reject',
    'player-3': 'approve',
    'player-4': 'approve',
  },
};

const enactmentRoom: Room = {
  ...activeRoomBase,
  phase: 'enactment',
  directorId: 'player-6',
  deputyId: 'player-4',
  previousDirectorId: 'player-6',
  directorHand: ['syndicate', 'syndicate', 'agency'],
  deputyHand: ['syndicate', 'agency'],
  investigationResults: {
    'player-5': 'agency',
  },
  surveillancePeek: ['agency', 'syndicate', 'agency'],
  surveillancePeekPending: true,
};

const autoEnactRoom: Room = {
  ...enactmentRoom,
  autoEnactment: true,
  directorHand: [],
  deputyHand: [],
  instabilityCount: 3,
};

const finishedRoom: Room = {
  ...enactmentRoom,
  status: 'finished',
  phase: 'finished',
  round: 6,
  syndicatePoliciesEnacted: 5,
  agencyPoliciesEnacted: 2,
};

export type PreviewScenarioKey =
  | 'lobby'
  | 'nomination'
  | 'voting'
  | 'enactment'
  | 'auto-enactment'
  | 'finished';

export const previewScenarios: Record<PreviewScenarioKey, { label: string; room: Room; players: Player[] }> = {
  lobby: { label: 'Lobby', room: baseRoom, players: lobbyPlayers },
  nomination: { label: 'Nomination', room: nominationRoom, players: playerRoster },
  voting: { label: 'Voting', room: votingRoom, players: playerRoster },
  enactment: { label: 'Enactment', room: enactmentRoom, players: playerRoster },
  'auto-enactment': { label: 'Auto-Enactment Chaos', room: autoEnactRoom, players: playerRoster },
  finished: { label: 'Finished', room: finishedRoom, players: playerRoster },
};

export const previewClientIds = Array.from(new Set(playerRoster.map((player) => player.clientId)));
