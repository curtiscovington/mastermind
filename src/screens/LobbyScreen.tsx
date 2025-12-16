import { useMemo } from 'react';
import type { FormEvent } from 'react';
import ActionButton from '../components/ActionButton';
import PlayerItem from '../components/PlayerItem';
import type { Player, Room } from '../types';
import './MastermindMockLobbyScreen.css';

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
  const codenameIsSaved =
    codenameReady && (you?.displayName?.trim() ?? '') === codenameDraft.trim() && !updatingCodename;

  const handleCodenameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!codenameReady || updatingCodename) return;
    await onUpdateCodename();
  };

  const canStart =
    isOwner && !starting && players.length >= minPlayers && !hasTooManyPlayers && !missingCodenames;

  return (
    <div className="mml-frame" aria-label="Lobby">
      <header className="mml-top">
        <div className="mml-room">
          <p className="mml-eyebrow">Room Code</p>
          <h1 className="mml-code" aria-label={`Room code ${room.code}`}>
            {room.code}
          </h1>
          <p className="mml-muted">Share this code to join the lobby.</p>
        </div>
      </header>

      <main className="mml-main">
        <section className="mml-card" aria-label="Players">
          <form className="mml-grid" aria-label="Lobby controls" onSubmit={handleCodenameSubmit}>
            <label className="mml-field">
              <span>Your codename</span>
              <input
                type="text"
                value={codenameDraft}
                onChange={(event) => onChangeCodename(event.target.value)}
                placeholder="Choose a codename"
                minLength={2}
                required
                disabled={updatingCodename}
              />
            </label>

            <button
              type="submit"
              className={`mml-btn mml-btn--ready ${codenameIsSaved ? 'is-on' : ''}`}
              disabled={!codenameReady || updatingCodename}
            >
              {updatingCodename ? 'Saving…' : codenameIsSaved ? 'Saved' : 'Save codename'}
            </button>
          </form>

          {hasTooManyPlayers ? (
            <p className="mml-alert" role="status">
              Too many players — remove {players.length - maxPlayers} to start.
            </p>
          ) : null}

          {missingCodenames ? (
            <p className="mml-alert" role="status">
              Waiting on codenames from all players.
            </p>
          ) : null}

          {!isOwner ? (
            <p className="mml-muted" role="status">
              Waiting for the Owner to start the game.
            </p>
          ) : null}

          <ul className="mml-list" aria-label="Player roster">
            {players.map((player, index) => {
              const hasCodename = !!player.displayName?.trim();
              const title = hasCodename ? player.displayName.trim() : `Player ${index + 1}`;
              const showReadyRing = hasCodename;

              return (
                <PlayerItem
                  key={player.id}
                  title={title}
                  isOwner={player.clientId === room.ownerClientId}
                  isYou={player.clientId === clientId}
                  showReadyRing={showReadyRing}
                />
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="mml-footer" aria-label="Start controls">
        <div className="mml-footer__meta">
          <p className="mml-muted">
            Min players: {minPlayers}. Max players: {maxPlayers}. Everyone needs a codename.
          </p>
        </div>
        <ActionButton
          variant="green"
          kind="lobbyPrimary"
          disabled={!canStart}
          onClick={async () => {
            if (!canStart) return;
            await onStartGame();
          }}
        >
          {starting ? 'Assigning roles…' : 'Start Game'}
        </ActionButton>
      </footer>
    </div>
  );
};

export default LobbyScreen;
