import type { HTMLAttributes } from 'react';
import './GameWonPanel.css';

type AgencyWin = {
  winner: 'agency';
  reason: 'policy';
};

type SyndicateWin = {
  winner: 'syndicate';
  reason: 'policy' | 'mastermind_vote';
};

export type GameWonPanelProps = (AgencyWin | SyndicateWin) & {
  label?: string;
  title?: string;
  detail?: string;
  mastermindName?: string;
  syndicateMembers?: string[];
} & HTMLAttributes<HTMLElement>;

const defaultReasonText = (props: AgencyWin | SyndicateWin) => {
  if (props.winner === 'agency') return 'Agency filled the policy track';
  if (props.reason === 'mastermind_vote') return 'Mastermind elected';
  return 'Syndicate filled the policy track';
};

const defaultDetailText = (props: AgencyWin | SyndicateWin) => {
  if (props.winner === 'agency') return 'Agency control is secured. The Syndicate has been contained. World peace ensured.';
  if (props.reason === 'mastermind_vote') return 'With the Mastermind in power, the Syndicate seizes control.';
  return 'Syndicate influence is absolute. The Agency collapses.';
};

const iconClassFor = (props: AgencyWin | SyndicateWin) => {
  if (props.winner === 'agency') return 'fas fa-shield-alt';
  if (props.reason === 'mastermind_vote') return 'fas fa-chess-king';
  return 'fas fa-skull';
};

const GameWonPanel = ({
  winner,
  reason,
  label = 'Game over',
  title,
  detail,
  syndicateMembers,
  className,
  ...rest
}: GameWonPanelProps) => {
  const resolvedTitle = title ?? `${winner === 'agency' ? 'Agency' : 'Syndicate'} wins`;
  const resolvedReason = defaultReasonText({ winner, reason } as AgencyWin | SyndicateWin);
  const resolvedDetail = detail ?? defaultDetailText({ winner, reason } as AgencyWin | SyndicateWin);
  const showSyndicateRoster = Boolean(mastermindName || syndicateMembers?.length);

  return (
    <section
      className={['mm-game-won', `mm-game-won--${winner}`, className].filter(Boolean).join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-game-won__icon" aria-hidden>
        <i className={iconClassFor({ winner, reason } as AgencyWin | SyndicateWin)} aria-hidden />
      </div>
      <p className="mm-game-won__title">{resolvedTitle}</p>
      <p className="mm-game-won__reason">{resolvedReason}</p>
      <p className="mm-game-won__detail">{resolvedDetail}</p>
      {showSyndicateRoster ? (
        <div className="mm-game-won__roster" aria-label="Syndicate roster">
          <p className="mm-game-won__roster-title">Syndicate members</p>
          <ul className="mm-game-won__roster-list" aria-label="Syndicate members">
            {mastermindName ? (
              <li key={`mastermind-${mastermindName}`} className="mm-game-won__roster-item mm-game-won__roster-item--mastermind">
                <i className="fas fa-chess-king" aria-hidden />
                <span>{mastermindName}</span>
                <span className="mm-game-won__roster-role">Mastermind</span>
              </li>
            ) : null}
            {syndicateMembers?.map((member) => (
              <li key={member} className="mm-game-won__roster-item">
                <i className="fas fa-user-secret" aria-hidden />
                <span>{member}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default GameWonPanel;
