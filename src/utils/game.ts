import type { Player, Role } from '../types';

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

  let agents = 0;
  if (playerCount >= 6 && playerCount <= 8) {
    agents = 1;
  } else if (playerCount >= 9) {
    agents = 2;
  }

  const civilians = Math.max(playerCount - (1 + agents), 0);

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

export const assignRolesToPlayers = (players: Player[]): { playerId: string; role: Role }[] => {
  const roles = shuffle(buildRoleList(players.length));
  const assignments: { playerId: string; role: Role }[] = [];

  players.forEach((player, index) => {
    assignments.push({ playerId: player.id, role: roles[index] ?? 'civilian' });
  });

  return assignments;
};
