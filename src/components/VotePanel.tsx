import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import './VotePanel.css';
import ActionButton from './ActionButton';

export type VoteChoice = 'approve' | 'reject';

export type VotePanelProps = {
  value?: VoteChoice | null;
  defaultValue?: VoteChoice | null;
  onChange?: (value: VoteChoice) => void;
  disabled?: boolean;
  lockOnSelect?: boolean;
  label?: string;
  approveLabel?: string;
  rejectLabel?: string;
  castMessage?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue' | 'value'>;

const VotePanel = ({
  value,
  defaultValue = null,
  onChange,
  disabled = false,
  lockOnSelect = true,
  label = 'Voting',
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  castMessage = 'Your vote has been cast.',
  className,
  ...rest
}: VotePanelProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<VoteChoice | null>(defaultValue);
  const isControlled = value !== undefined;
  const choice = isControlled ? value : uncontrolledValue;

  const setChoice = (next: VoteChoice) => {
    if (!isControlled) {
      setUncontrolledValue(next);
    }
    onChange?.(next);
  };

  const isLocked = Boolean(choice) && lockOnSelect;

  return (
    <section className={['mm-vote', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className={`mm-vote__buttons ${choice ? 'is-cast' : ''}`}>
        <ActionButton
          variant="green"
          selected={choice === 'approve'}
          onClick={() => setChoice('approve')}
          disabled={disabled || isLocked}
          aria-pressed={choice === 'approve'}
        >
          {approveLabel}
        </ActionButton>
        <ActionButton
          variant="red"
          selected={choice === 'reject'}
          onClick={() => setChoice('reject')}
          disabled={disabled || isLocked}
          aria-pressed={choice === 'reject'}
        >
          {rejectLabel}
        </ActionButton>
      </div>

      <p className={`mm-vote__cast ${choice ? 'is-visible' : ''}`} aria-live="polite" aria-hidden={!choice}>
        {castMessage}
      </p>
    </section>
  );
};

export default VotePanel;
