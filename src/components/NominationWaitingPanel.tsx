import type { HTMLAttributes } from 'react';
import './CandidatesPanel.css';
import './NominationWaitingPanel.css';

export type NominationWaitingPanelProps = {
  directorName: string;
  directorTitle?: string;
  message?: string;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const NominationWaitingPanel = ({
  directorName,
  directorTitle = 'Director',
  message = 'Waiting for nomination',
  label = 'Nomination status',
  className,
  ...rest
}: NominationWaitingPanelProps) => {
  return (
    <section className={['mm-nomination-wait', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className="mm-player-row mm-player-row--director">
        <div className="mm-player-icon" aria-hidden>
          <i className="fas fa-user-tie" aria-hidden />
        </div>
        <div className="mm-player-info">
          <span className="mm-player-title">{directorTitle}</span>
          <span className="mm-player-name">{directorName}</span>
        </div>
      </div>

      <p className="mm-nomination-wait__status" aria-live="polite">
        {message}
      </p>
    </section>
  );
};

export default NominationWaitingPanel;

