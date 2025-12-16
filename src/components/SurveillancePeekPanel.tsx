import type { HTMLAttributes } from 'react';
import type { PolicyCard } from '../types';
import ActionButton from './ActionButton';
import './CandidatesPanel.css';
import './DirectorPolicyDiscardPanel.css';

export type SurveillancePeekPanelProps = {
  directorName: string;
  directorTitle?: string;
  policies: PolicyCard[];
  disabled?: boolean;
  onAcknowledge?: () => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const labelForPolicy: Record<PolicyCard, string> = {
  agency: 'Agency',
  syndicate: 'Syndicate',
};

const SurveillancePeekPanel = ({
  directorName,
  directorTitle = 'Director',
  policies,
  disabled = false,
  onAcknowledge,
  label = 'Surveillance',
  className,
  ...rest
}: SurveillancePeekPanelProps) => {
  return (
    <section
      className={['mm-discard', className].filter(Boolean).join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-nomination__header" aria-label="Surveillance policy peek">
        <div className="mm-player-row mm-player-row--director">
          <div className="mm-player-icon" aria-hidden>
            <i className="fas fa-user-tie" aria-hidden />
          </div>
          <div className="mm-player-info">
            <span className="mm-player-title">{directorTitle}</span>
            <span className="mm-player-name">{directorName}</span>
          </div>
        </div>

        <p className="mm-candidates-divider" aria-live="polite">
          Review the next 3 policies
        </p>
      </div>

      <div className="mm-discard__cards" role="list" aria-label="Policy cards">
        {policies.slice(0, 3).map((policy, index) => (
          <div
            key={`${policy}-${index}`}
            role="listitem"
            className={['mm-policy-card', `mm-policy-card--${policy}`].join(' ')}
          >
            <span className="mm-policy-card__badge">Policy</span>
            <span className="mm-policy-card__name">{labelForPolicy[policy]}</span>
          </div>
        ))}
      </div>

      <div className="mm-discard__actions">
        <ActionButton variant="green" onClick={onAcknowledge} disabled={disabled || policies.length < 3}>
          Acknowledge
        </ActionButton>
      </div>
    </section>
  );
};

export default SurveillancePeekPanel;

