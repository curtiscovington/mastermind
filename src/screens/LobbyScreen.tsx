import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import ActionButton from '../components/ActionButton';
import PlayerItem from '../components/PlayerItem';
import Ring from '../components/Ring';
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
  const [hasShownRoster, setHasShownRoster] = useState(codenameIsSaved);
  const showRoster = codenameIsSaved || hasShownRoster;

  const handleReadySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!codenameReady || updatingCodename) return;
    await onUpdateCodename();
    setHasShownRoster(true);
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
        <Ring className="mml-lobby-ring" showBackground clipContent>
          <div className={`mml-lobby-console ${showRoster ? 'is-ready' : ''}`}>
            <form className="mml-join" onSubmit={handleReadySubmit} aria-hidden={showRoster}>
              <label className="mml-field">
                <span className="sr-only">Codename</span>
                <input
                  type="text"
                  placeholder="Choose a codename"
                  value={codenameDraft}
                  onChange={(event) => onChangeCodename(event.target.value)}
                  required
                  minLength={2}
                  disabled={updatingCodename}
                />
              </label>

              <ActionButton
                variant="green"
                kind="lobbyPrimary"
                type="submit"
                disabled={!codenameReady || updatingCodename}
              >
                Ready
              </ActionButton>
            </form>

            <div className="mml-roster" aria-hidden={!showRoster}>
              <ul className="mml-list mml-roster__list" aria-label="Player roster">
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
            </div>
          </div>
        </Ring>

        <section className="mml-lobby-status" aria-label="Lobby status">
          {hasTooManyPlayers ? (
            <p className="mml-alert" role="status">
              Too many players — remove {players.length - maxPlayers} to start.
            </p>
          ) : null}

          {missingCodenames ? (
            <p className="mml-alert" role="status">
              Waiting on codenames from all agents.
            </p>
          ) : null}

          {!isOwner ? (
            <p className="mml-muted" role="status">
              Waiting for the Owner to start the game.
            </p>
          ) : null}
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
