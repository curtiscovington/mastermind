import { useMemo, useState } from 'react';
import type { Player, Room } from '../types';
import Ring from '../components/Ring';
import GameWonPanel from '../components/GameWonPanel';
import PlayersNotice from '../components/PlayersNotice';
import PolicyTracks from '../components/PolicyTracks';
import './MastermindMockScreen.css';

const iconForRole = (player: Player) => {
  if (player.role === 'mastermind') return 'fas fa-chess-king';
  if (player.role === 'syndicate_agent') return 'fas fa-user-secret';
  return 'fas fa-user';
};

const ResultsScreen = ({ room, players }: { room: Room; players: Player[] }) => {
  const [playersOpen, setPlayersOpen] = useState(false);

  const syndicateEnacted = room.syndicatePoliciesEnacted ?? 0;
  const agencyEnacted = room.agencyPoliciesEnacted ?? 0;
  const winner = agencyEnacted >= 5 ? 'agency' : 'syndicate';

  const mastermindName = useMemo(
    () => players.find((player) => player.role === 'mastermind')?.displayName ?? undefined,
    [players],
  );
  const syndicateMembers = useMemo(
    () => players.filter((player) => player.role === 'syndicate_agent').map((player) => player.displayName),
    [players],
  );

  const playerList = useMemo(
    () =>
      players.map((player) => ({
        id: player.id,
        name: player.displayName || 'Unknown',
        iconClassName: iconForRole(player),
      })),
    [players],
  );

  return (
    <div className="mm-frame" aria-label={`Game results for room ${room.code}`}>
      <header className="mm-top" aria-label="Results actions">
        <div className="mm-top-actions">
          <button
            type="button"
            className="mm-icon-btn"
            aria-label="Show players"
            onClick={() => setPlayersOpen(true)}
          >
            <i className="fas fa-users" aria-hidden />
          </button>

          <PlayersNotice open={playersOpen} onDismiss={() => setPlayersOpen(false)} players={playerList} />
        </div>
      </header>

      <main className="mm-dashboard" aria-label="Outcome">
        <Ring>
          {winner === 'agency' ? (
            <GameWonPanel winner="agency" reason="policy" />
          ) : (
            <GameWonPanel winner="syndicate" reason="policy" mastermindName={mastermindName} syndicateMembers={syndicateMembers} />
          )}
        </Ring>
      </main>

      <footer className="mm-bottom" aria-label="Final policy tracks">
        <PolicyTracks
          tracks={[
            { team: 'agency', total: 5, filled: agencyEnacted },
            { team: 'syndicate', total: 6, filled: syndicateEnacted },
          ]}
        />
      </footer>
    </div>
  );
};

export default ResultsScreen;

