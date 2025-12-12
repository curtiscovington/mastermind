import type { Player, Room } from '../types';

type Props = {
  room: Room;
  players: Player[];
  clientId: string;
  onStartGame: () => Promise<void>;
  starting: boolean;
};

const LobbyScreen = ({ room, players, clientId, onStartGame, starting }: Props) => {
  const isOwner = room.ownerClientId === clientId;
  const minPlayers = room.minPlayers ?? 5;
  const maxPlayers = room.maxPlayers ?? 10;
  const hasTooManyPlayers = players.length > maxPlayers;

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Room Code</p>
          <h1 className="room-code">{room.code}</h1>
          <p className="muted">Share this code with everyone in the room.</p>
        </div>
        <div className="badge">{room.status === 'lobby' ? 'Lobby' : room.status}</div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Players ({players.length})</h2>
          {isOwner ? <span className="pill">You are the Owner</span> : null}
        </div>
        <ul className="list">
          {players.map((player) => (
            <li key={player.id} className="list-row">
              <div>
                <p className="list-title">
                  {player.clientId === clientId ? 'Your codename is locked' : 'Codename hidden'}
                </p>
                <p className="muted">{player.clientId === clientId ? 'This is you' : 'Standing by'}</p>
              </div>
              {player.clientId === room.ownerClientId ? <span className="pill">Owner</span> : null}
            </li>
          ))}
          {players.length === 0 ? <p className="muted">Waiting for players…</p> : null}
        </ul>

        {isOwner ? (
          <div className="stack">
            <p className="muted">
              Minimum players: {minPlayers}. Maximum players: {maxPlayers}. Syndicate Agents join the
              Mastermind as the group grows; at 7+ players, the Mastermind may not know their agents.
              Codenames stay hidden here and will be revealed once the game begins.
            </p>
            {hasTooManyPlayers ? (
              <p className="error">Too many players — remove {players.length - maxPlayers} to start.</p>
            ) : null}
            <button
              className="primary"
              disabled={
                starting || players.length < minPlayers || hasTooManyPlayers
              }
              onClick={onStartGame}
            >
              {starting ? 'Assigning roles…' : 'Start Game (Assign Roles)'}
            </button>
          </div>
        ) : (
          <p className="muted">Waiting for the Owner to start the game.</p>
        )}
      </div>
    </div>
  );
};

export default LobbyScreen;
