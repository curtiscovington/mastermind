import type { Player, Room } from '../types';

type Props = {
  room: Room;
  players: Player[];
  clientId: string;
  onNextRound: () => Promise<void>;
  onToggleAlive: (player: Player) => Promise<void>;
  onEndGame: () => Promise<void>;
  busyAction: string | null;
};

const roleCopy: Record<string, string> = {
  mastermind: 'You are the MASTERMIND. Steer the Syndicate to victory.',
  syndicate_agent: 'You are a Syndicate Agent working with the Mastermind.',
  agency: 'You are Agency. Expose the Mastermind.',
};

const teamCopy: Record<string, string> = {
  syndicate: 'Syndicate',
  agency: 'Agency',
};

const roleLabels: Record<string, string> = {
  mastermind: 'Mastermind',
  syndicate_agent: 'Syndicate Agent',
  agency: 'Agency',
};

const GameScreen = ({
  room,
  players,
  clientId,
  onNextRound,
  onToggleAlive,
  onEndGame,
  busyAction,
}: Props) => {
  const you = players.find((p) => p.clientId === clientId);
  const isOwner = room.ownerClientId === clientId;
  const roleDescription = you?.role
    ? roleCopy[you.role] ?? 'Role assigned.'
    : 'Waiting for role assignment…';
  const teamLabel = you?.team ? teamCopy[you.team] ?? you.team : 'Unassigned';
  const knownTeammates = you?.knownTeammateIds
    ? players.filter((player) => you.knownTeammateIds?.includes(player.id))
    : [];

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Room {room.code}</p>
          <h1>Round {room.round}</h1>
          <p className="muted">Status: {room.phase}</p>
        </div>
        <div className="badge">{isOwner ? 'Owner' : 'Player'}</div>
      </header>

      <div className="card emphasis">
        <div className="card-header">
          <h2>Your Role</h2>
          {you?.alive ? <span className="pill success">Alive</span> : <span className="pill danger">Eliminated</span>}
        </div>
        <p className="role-callout">{roleDescription}</p>
        <p className="muted">Team: {teamLabel}</p>

        {you ? (
          <div className="stack">
            <p className="muted">Known teammates</p>
            {knownTeammates.length ? (
              <ul className="list">
                {knownTeammates.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{roleLabels[player.role ?? ''] ?? 'Unknown'}</p>
                    </div>
                    <span className={player.alive ? 'pill success' : 'pill danger'}>
                      {player.alive ? 'Alive' : 'Eliminated'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No teammates revealed to you yet.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Players</h2>
        </div>
        <ul className="list">
          {players.map((player) => (
            <li key={player.id} className="list-row">
              <div>
                <p className="list-title">{player.displayName}</p>
                <p className="muted">
                  {player.clientId === clientId ? 'You' : player.clientId === room.ownerClientId ? 'Owner' : 'Player'}
                </p>
              </div>
              <div className="list-actions">
                {room.status === 'finished' ? (
                  <>
                    <span className="pill neutral">
                      {player.team ? teamCopy[player.team] ?? player.team : 'Unknown Team'}
                    </span>
                    <span className="pill neutral">{player.role ? roleLabels[player.role] ?? player.role : 'Unknown'}</span>
                  </>
                ) : null}
                <span className={player.alive ? 'pill success' : 'pill danger'}>
                  {player.alive ? 'Alive' : 'Eliminated'}
                </span>
                {isOwner && room.status !== 'finished' ? (
                  <button
                    className="ghost"
                    onClick={() => onToggleAlive(player)}
                    disabled={busyAction === player.id}
                  >
                    {busyAction === player.id ? 'Updating…' : player.alive ? 'Mark Dead' : 'Revive'}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isOwner ? (
        <div className="card owner-controls">
          <div className="card-header">
            <h2>Owner Controls</h2>
          </div>
          <div className="button-row">
            <button className="secondary" onClick={onNextRound} disabled={busyAction === 'round'}>
              {busyAction === 'round' ? 'Advancing…' : 'Next Round'}
            </button>
            <button className="danger" onClick={onEndGame} disabled={busyAction === 'end'}>
              {busyAction === 'end' ? 'Ending…' : 'End Game'}
            </button>
          </div>
        </div>
      ) : null}

      {room.status === 'finished' ? (
        <div className="card">
          <div className="card-header">
            <h2>Game Over</h2>
          </div>
          <p className="muted">Roles revealed for everyone.</p>
        </div>
      ) : null}
    </div>
  );
};

export default GameScreen;
