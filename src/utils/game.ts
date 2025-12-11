import type { Player, PolicyCard, Role, Team } from '../types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

export const generateRoomCode = () => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
};

const MAX_PLAYERS = 10;

export const buildRoleList = (playerCount: number): Role[] => {
  if (playerCount <= 0) return [];
  if (playerCount > MAX_PLAYERS) {
    throw new Error(`Cannot assign roles for more than ${MAX_PLAYERS} players`);
  }

  // Based on the rulebook distribution for 5–10 players.
  const distribution: Record<number, { agency: number; syndicateAgents: number }> = {
    5: { agency: 3, syndicateAgents: 1 },
    6: { agency: 4, syndicateAgents: 1 },
    7: { agency: 4, syndicateAgents: 2 },
    8: { agency: 5, syndicateAgents: 2 },
    9: { agency: 6, syndicateAgents: 2 },
    10: { agency: 6, syndicateAgents: 3 },
  };

  const breakdown = distribution[playerCount];
  if (!breakdown) return [];

  const roles: Role[] = ['mastermind'];
  for (let i = 0; i < breakdown.syndicateAgents; i += 1) {
    roles.push('syndicate_agent');
  }
  for (let i = 0; i < breakdown.agency; i += 1) {
    roles.push('agency');
  }

  return roles;
};

export const shuffle = <T>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const buildPolicyDeck = (): PolicyCard[] =>
  shuffle([
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'syndicate',
    'agency',
    'agency',
    'agency',
    'agency',
    'agency',
    'agency',
  ]);

export const drawPolicyCards = (
  deck: PolicyCard[],
  discard: PolicyCard[],
  count: number,
): { drawn: PolicyCard[]; deck: PolicyCard[]; discard: PolicyCard[] } => {
  let availableDeck = [...deck];
  let availableDiscard = [...discard];

  if (availableDeck.length < count) {
    availableDeck = shuffle([...availableDeck, ...availableDiscard]);
    availableDiscard = [];
  }

  const drawn = availableDeck.slice(0, count);
  const remainingDeck = availableDeck.slice(count);

  return { drawn, deck: remainingDeck, discard: availableDiscard };
};

type PlayerAssignment = { playerId: string; role: Role; team: Team; knownTeammateIds: string[] };

const mastermindKnowsTeamThreshold = 6; // With 6 or fewer players, the mastermind knows their allies.

export const assignRolesToPlayers = (players: Player[]): PlayerAssignment[] => {
  const roles = shuffle(buildRoleList(players.length));
  if (roles.length < players.length) {
    throw new Error('Not enough roles for the current player count');
  }
  const assignments: PlayerAssignment[] = [];

  players.forEach((player, index) => {
    const role = roles[index] ?? 'agency';
    const team: Team = role === 'agency' ? 'agency' : 'syndicate';
    assignments.push({ playerId: player.id, role, team, knownTeammateIds: [] });
  });

  const mastermind = assignments.find((assignment) => assignment.role === 'mastermind');
  const syndicateAgents = assignments.filter((assignment) => assignment.role === 'syndicate_agent');
  const mastermindShouldKnowTeam = players.length <= mastermindKnowsTeamThreshold;

  // Syndicate agents know each other and the mastermind. The mastermind may or may not know the agents
  // depending on player count (to mirror Secret Hitler's knowledge rules).
  assignments.forEach((assignment) => {
    if (assignment.role === 'mastermind') {
      assignment.knownTeammateIds = mastermindShouldKnowTeam
        ? syndicateAgents.map((agent) => agent.playerId)
        : [];
    } else if (assignment.role === 'syndicate_agent') {
      assignment.knownTeammateIds = [
        ...syndicateAgents
          .filter((agent) => agent.playerId !== assignment.playerId)
          .map((agent) => agent.playerId),
        ...(mastermind ? [mastermind.playerId] : []),
      ];
    }
  });

  return assignments;
};
