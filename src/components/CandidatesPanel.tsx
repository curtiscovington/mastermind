import type { HTMLAttributes } from 'react';
import { Fragment } from 'react';
import './CandidatesPanel.css';

export type CandidateRole = 'director' | 'global';

export type Candidate = {
  id: string;
  role: CandidateRole;
  title: string;
  name: string;
  iconClassName?: string;
};

export type CandidatesPanelProps = {
  candidates: Candidate[];
  label?: string;
  betweenLabel?: string;
  betweenAfterIndex?: number;
} & HTMLAttributes<HTMLElement>;

const defaultIconForRole: Record<CandidateRole, string> = {
  director: 'fas fa-user-tie',
  global: 'fas fa-user-secret',
};

const CandidatesPanel = ({
  candidates,
  label = 'Current candidates',
  betweenLabel,
  betweenAfterIndex = 0,
  className,
  ...rest
}: CandidatesPanelProps) => {
  return (
    <section className={['mm-players', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      {candidates.map((candidate, index) => (
        <Fragment key={candidate.id}>
          <div className={`mm-player-row mm-player-row--${candidate.role}`}>
            <div className="mm-player-icon" aria-hidden>
              <i className={candidate.iconClassName ?? defaultIconForRole[candidate.role]} aria-hidden />
            </div>
            <div className="mm-player-info">
              <span className="mm-player-title">{candidate.title}</span>
              <span className="mm-player-name">{candidate.name}</span>
            </div>
          </div>
          {betweenLabel && index === betweenAfterIndex && index < candidates.length - 1 ? (
            <div className="mm-candidates-divider" aria-hidden>
              {betweenLabel}
            </div>
          ) : null}
        </Fragment>
      ))}
    </section>
  );
};

export default CandidatesPanel;
