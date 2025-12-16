import type { HTMLAttributes } from 'react';
import type { Team } from '../types';
import './RoleNotice.css';
import './InvestigationNotice.css';

export type InvestigationNoticeProps = {
  open: boolean;
  targetName: string;
  team: Team | null;
  onDismiss: () => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const iconForTeam = (team: Team | null) => {
  if (team === 'agency') return 'fas fa-shield-alt';
  if (team === 'syndicate') return 'fas fa-skull';
  return 'fas fa-question-circle';
};

const titleForTeam = (team: Team | null) => {
  if (team === 'agency') return 'Agency';
  if (team === 'syndicate') return 'Syndicate';
  return 'Unknown';
};

const InvestigationNotice = ({
  open,
  targetName,
  team,
  onDismiss,
  label = 'Investigation result',
  className,
  ...rest
}: InvestigationNoticeProps) => {
  return (
    <section
      className={['mm-notice', 'mm-investigation', open ? 'is-open' : '', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-hidden={!open}
      {...rest}
    >
      <button
        type="button"
        className="close-btn mm-notice__close"
        onClick={onDismiss}
        aria-label="Dismiss investigation result"
        tabIndex={open ? 0 : -1}
      >
        <i className="fas fa-times" aria-hidden />
      </button>

      <div className="mm-avatar" aria-hidden>
        <i className={`${iconForTeam(team)} mm-avatar__icon`} aria-hidden />
      </div>

      <div className="mm-investigation__content">
        <p className="mm-investigation__label">Investigation</p>
        <p className="mm-investigation__target">{targetName}</p>
        <p className="mm-investigation__team">{titleForTeam(team)}</p>
      </div>
    </section>
  );
};

export default InvestigationNotice;

