import { useMemo, useState } from 'react';
import ActionButton from '../components/ActionButton';
import PlayerItem from '../components/PlayerItem';
import './MastermindMockLobbyScreen.css';

type MockPlayer = {
  id: string;
  codename: string;
  isOwner?: boolean;
  isYou?: boolean;
  hasCodename: boolean;
  isReady: boolean;
};

const MastermindMockLobbyScreen = () => {
  const [codenameDraft, setCodenameDraft] = useState('Agent_K');
  const [ready, setReady] = useState(true);

  const players = useMemo<MockPlayer[]>(
    () => [
      { id: 'p1', codename: 'Agent_K', isOwner: true, isYou: true, hasCodename: true, isReady: ready },
      { id: 'p2', codename: 'Cipher_X', hasCodename: true, isReady: true },
      { id: 'p3', codename: 'Violet_7', hasCodename: true, isReady: false },
      { id: 'p4', codename: '', hasCodename: false, isReady: false },
      { id: 'p5', codename: 'Nova_9', hasCodename: true, isReady: true },
      { id: 'p6', codename: 'Echo_3', hasCodename: true, isReady: false },
    ],
    [ready],
  );

  const minPlayers = 5;
  const maxPlayers = 10;
  const missingCodenames = players.some((player) => !player.hasCodename);
  const everyoneReady = players.every((player) => player.isReady && player.hasCodename);
  const canStart = players.length >= minPlayers && players.length <= maxPlayers && everyoneReady;

  const roomCode = 'XJ9Q';

  return (
    <div className="mml-frame" aria-label="Mastermind lobby UI mock">
      <header className="mml-top">
        <div className="mml-room">
          <p className="mml-eyebrow">Room Code</p>
          <h1 className="mml-code" aria-label={`Room code ${roomCode}`}>
            {roomCode}
          </h1>
          <p className="mml-muted">Share this code to join the lobby.</p>
        </div>
      </header>

      <main className="mml-main">
        <section className="mml-card" aria-label="Players">
          <div className="mml-grid" aria-label="Lobby controls">
            <label className="mml-field">
              <span>Your codename</span>
              <input
                type="text"
                value={codenameDraft}
                onChange={(event) => setCodenameDraft(event.target.value)}
                placeholder="Choose a codename"
                minLength={2}
              />
            </label>

            <button
              type="button"
              className={`mml-btn mml-btn--ready ${ready ? 'is-on' : ''}`}
              onClick={() => setReady((value) => !value)}
              aria-pressed={ready}
            >
              {ready ? 'Ready' : 'Ready up'}
            </button>
          </div>

          {missingCodenames ? (
            <p className="mml-alert" role="status">
              Waiting on codenames from all players.
            </p>
          ) : null}

          {!everyoneReady ? (
            <p className="mml-muted" role="status">
              Everyone must be ready before the game can start.
            </p>
          ) : null}

          {ready ? (
            <ul className="mml-list" aria-label="Player roster">
              {players.map((player, index) => {
                const title = player.hasCodename ? player.codename : `Player ${index + 1}`;
                const showReadyRing = player.hasCodename && player.isReady;

                return (
                  <PlayerItem
                    key={player.id}
                    title={title}
                    isOwner={player.isOwner}
                    isYou={player.isYou}
                    showReadyRing={showReadyRing}
                  />
                );
              })}
            </ul>
          ) : (
            <p className="mml-muted" role="status">
              Ready up to reveal the roster.
            </p>
          )}
        </section>
      </main>

      <footer className="mml-footer" aria-label="Start controls">
        <div className="mml-footer__meta">
          <p className="mml-muted">
            Min players: {minPlayers}. Everyone needs a codename and must be ready.
          </p>
        </div>
        <ActionButton variant="green" kind="lobbyPrimary" disabled={!canStart}>
          Start Game
        </ActionButton>
      </footer>
    </div>
  );
};

export default MastermindMockLobbyScreen;
