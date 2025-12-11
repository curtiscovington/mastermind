import type { Player, Role, Team } from '../types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

export const generateRoomCode = () => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
};

export const buildRoleList = (playerCount: number): Role[] => {
  if (playerCount <= 0) return [];

  // Based on Secret Hitler distribution: increase mastermind-aligned agents as the player count grows.
  let mastermindTeamSize = 2; // mastermind + 1 agent at the minimum size
  if (playerCount >= 7 && playerCount <= 8) {
    mastermindTeamSize = 3; // mastermind + 2 agents
  } else if (playerCount >= 9) {
    mastermindTeamSize = 4; // mastermind + 3 agents
  }

  const agents = Math.max(mastermindTeamSize - 1, 0);
  const civilians = Math.max(playerCount - mastermindTeamSize, 0);

  const roles: Role[] = ['mastermind'];
  for (let i = 0; i < agents; i += 1) {
    roles.push('agent');
  }
  for (let i = 0; i < civilians; i += 1) {
    roles.push('civilian');
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

type PlayerAssignment = { playerId: string; role: Role; team: Team; knownTeammateIds: string[] };

const mastermindKnowsTeamThreshold = 6; // With 6 or fewer players, the mastermind knows their allies.

export const assignRolesToPlayers = (players: Player[]): PlayerAssignment[] => {
  const roles = shuffle(buildRoleList(players.length));
  const assignments: PlayerAssignment[] = [];

  players.forEach((player, index) => {
    const role = roles[index] ?? 'civilian';
    const team: Team = role === 'mastermind' || role === 'agent' ? 'mastermind' : 'resistance';
    assignments.push({ playerId: player.id, role, team, knownTeammateIds: [] });
  });

  const mastermind = assignments.find((assignment) => assignment.role === 'mastermind');
  const agents = assignments.filter((assignment) => assignment.role === 'agent');
  const mastermindShouldKnowTeam = players.length <= mastermindKnowsTeamThreshold;

  // Agents know each other and the mastermind. The mastermind may or may not know the agents
  // depending on player count (to mirror Secret Hitler's knowledge rules).
  assignments.forEach((assignment) => {
    if (assignment.role === 'mastermind') {
      assignment.knownTeammateIds = mastermindShouldKnowTeam
        ? agents.map((agent) => agent.playerId)
        : [];
    } else if (assignment.role === 'agent') {
      assignment.knownTeammateIds = [
        ...agents.filter((agent) => agent.playerId !== assignment.playerId).map((agent) => agent.playerId),
        ...(mastermind ? [mastermind.playerId] : []),
      ];
    }
  });

  return assignments;
};
