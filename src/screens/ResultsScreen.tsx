import type { Player, Room } from '../types';

const ResultsScreen = ({ room, players }: { room: Room; players: Player[] }) => {
  const syndicateEnacted = room.syndicatePoliciesEnacted ?? 0;
  const agencyEnacted = room.agencyPoliciesEnacted ?? 0;
  const survivingPlayers = players.filter((player) => player.alive);
  const eliminatedPlayers = players.filter((player) => !player.alive);

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Room {room.code}</p>
          <h1>Game finished</h1>
          <p className="muted">Review the outcome and restart if you want another round.</p>
        </div>
        <div className="badge">Finished</div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Policy Summary</h2>
          <span className="pill neutral">Round {room.round}</span>
        </div>
        <ul className="list">
          <li className="list-row">
            <div>
              <p className="list-title">Syndicate Policies Enacted</p>
              <p className="muted">Progress toward Mastermind victory.</p>
            </div>
            <span className="pill danger">{syndicateEnacted} / 6</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Agency Policies Enacted</p>
              <p className="muted">Progress toward Agency victory.</p>
            </div>
            <span className="pill success">{agencyEnacted} / 6</span>
          </li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Players</h2>
          <span className="pill neutral">Status at end</span>
        </div>
        <div className="card-grid">
          <div className="stack">
            <p className="muted">Survivors</p>
            {survivingPlayers.length ? (
              <ul className="list">
                {survivingPlayers.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{player.role ?? 'Unknown role'}</p>
                    </div>
                    <span className="pill success">Alive</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No survivors this round.</p>
            )}
          </div>

          <div className="stack">
            <p className="muted">Eliminated</p>
            {eliminatedPlayers.length ? (
              <ul className="list">
                {eliminatedPlayers.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{player.role ?? 'Unknown role'}</p>
                    </div>
                    <span className="pill danger">Eliminated</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No one was eliminated.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
