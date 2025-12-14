import { useMemo } from 'react';
import type { FormEvent } from 'react';
import type { Player, Room } from '../types';

type Props = {
  room: Room;
  players: Player[];
  clientId: string;
  onStartGame: () => Promise<void>;
  starting: boolean;
  onUpdateCodename: () => Promise<void>;
  updatingCodename: boolean;
  missingCodenames: boolean;
  onChangeCodename: (value: string) => void;
  codenameDraft: string;
};

const LobbyScreen = ({
  room,
  players,
  clientId,
  onStartGame,
  starting,
  onUpdateCodename,
  updatingCodename,
  missingCodenames,
  onChangeCodename,
  codenameDraft,
}: Props) => {
  const isOwner = room.ownerClientId === clientId;
  const minPlayers = room.minPlayers ?? 5;
  const maxPlayers = room.maxPlayers ?? 10;
  const hasTooManyPlayers = players.length > maxPlayers;
  const you = useMemo(() => players.find((player) => player.clientId === clientId), [clientId, players]);
  const codenameReady = codenameDraft.trim().length >= 2;
  const hideCodenames = room.status === 'lobby';

  const handleCodenameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!codenameReady || updatingCodename) return;
    await onUpdateCodename();
  };

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

        <form className="stack" onSubmit={handleCodenameSubmit}>
          <label className="field">
            <span>Your codename</span>
            <input
              type="text"
              placeholder="Enter a codename to share with the table"
              value={codenameDraft}
              onChange={(e) => onChangeCodename(e.target.value)}
              minLength={2}
              required
            />
          </label>
          <div className="card-footer">
            <div>
              <p className="muted">
                Pick something everyone can recognize. You can change it until the game begins.
              </p>
              {missingCodenames ? (
                <p className="error">All players need a codename before the game can start.</p>
              ) : null}
            </div>
            <button type="submit" className="secondary" disabled={!codenameReady || updatingCodename}>
              {updatingCodename ? 'Saving…' : you?.displayName?.trim() ? 'Update codename' : 'Save codename'}
            </button>
          </div>
        </form>

        <ul className="list">
          {players.map((player, index) => {
            const hasCodename = !!player.displayName?.trim();
            const listTitle = hideCodenames
              ? `Player ${index + 1}`
              : player.displayName?.trim() || 'Awaiting codename';
            const listSubtitle =
              player.clientId === clientId
                ? 'This is you'
                : hasCodename
                  ? 'Codename ready'
                  : 'Needs a codename';

            return (
              <li key={player.id} className="list-row">
                <div>
                  <p className="list-title">{listTitle}</p>
                  <p className="muted">{listSubtitle}</p>
                </div>
                <div>
                  {player.clientId === room.ownerClientId ? <span className="pill">Owner</span> : null}
                  {!player.displayName?.trim() ? <span className="pill">Set codename</span> : null}
                </div>
              </li>
            );
          })}
          {players.length === 0 ? <p className="muted">Waiting for players…</p> : null}
        </ul>

        {isOwner ? (
          <div className="stack">
            <p className="muted">
              Minimum players: {minPlayers}. Maximum players: {maxPlayers}. Syndicate Agents join the
              Mastermind as the group grows; at 7+ players, the Mastermind may not know their agents.
              Everyone must claim a codename here before the game begins.
            </p>
            {hasTooManyPlayers ? (
              <p className="error">Too many players — remove {players.length - maxPlayers} to start.</p>
            ) : null}
            {missingCodenames ? (
              <p className="error">Waiting on codenames for all players.</p>
            ) : null}
            <button
              className="primary"
              disabled={
                starting || players.length < minPlayers || hasTooManyPlayers || missingCodenames
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
