import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import type { PolicyCard } from '../types';
import { getSyndicatePowerForPolicySlot } from '../utils/game';
import ActionButton from './ActionButton';
import SyndicatePowerIcon from './SyndicatePowerIcon';
import './CandidatesPanel.css';
import './DirectorPolicyDiscardPanel.css';

export type DirectorPolicyDiscardPanelProps = {
  directorName: string;
  directorTitle?: string;
  policies: PolicyCard[];
  syndicatePoliciesEnacted?: number;
  playerCount?: number;
  sent?: boolean;
  exiting?: boolean;
  prompt?: string;
  discardLabel?: string;
  sentMessage?: string;
  onDiscard?: (discardedIndex: number) => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const labelForPolicy: Record<PolicyCard, string> = {
  agency: 'Agency',
  syndicate: 'Syndicate',
};

const DirectorPolicyDiscardPanel = ({
  directorName,
  directorTitle = 'Director',
  policies,
  syndicatePoliciesEnacted,
  playerCount = 6,
  sent = false,
  exiting = false,
  prompt = 'Select a policy to discard',
  discardLabel = 'Discard',
  sentMessage = 'Policy discarded.',
  onDiscard,
  label = 'Policy discard',
  className,
  ...rest
}: DirectorPolicyDiscardPanelProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingSent, setPendingSent] = useState(false);
  const sentState = sent || pendingSent;
  const upcomingPower =
    syndicatePoliciesEnacted === undefined
      ? null
      : getSyndicatePowerForPolicySlot(syndicatePoliciesEnacted + 1, playerCount);

  const handleDiscard = () => {
    if (selectedIndex === null) return;
    setPendingSent(true);
    onDiscard?.(selectedIndex);
  };

  return (
    <section
      className={['mm-discard', sentState ? 'is-sent' : '', exiting ? 'is-exiting' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-nomination__header" aria-label="Director policy action">
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
          {prompt}
        </p>
      </div>

      <div className="mm-discard__cards" role="list" aria-label="Policy cards">
        {policies.slice(0, 3).map((policy, index) => {
          const selected = selectedIndex === index;
          return (
            <div
              key={`${policy}-${index}`}
              role="listitem"
              className={[
                'mm-policy-card',
                `mm-policy-card--${policy}`,
                selected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              tabIndex={sentState ? -1 : 0}
              onClick={() => {
                if (sentState) return;
                setSelectedIndex(index);
              }}
              onKeyDown={(event) => {
                if (sentState) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedIndex(index);
                }
              }}
              aria-selected={selected}
            >
              <span className="mm-policy-card__badge">Policy</span>
              {policy === 'syndicate' && upcomingPower ? (
                <span className="mm-policy-card__power" aria-label="Director power unlocked on enactment">
                  <SyndicatePowerIcon power={upcomingPower} />
                </span>
              ) : null}
              <span className="mm-policy-card__name">{labelForPolicy[policy]}</span>
            </div>
          );
        })}
      </div>

      <div className="mm-discard__actions">
        <ActionButton
          variant="red"
          onClick={handleDiscard}
          disabled={sentState || selectedIndex === null || policies.length < 3}
        >
          {discardLabel}
        </ActionButton>
        <p
          className={`mm-discard__sent ${sentState ? 'is-visible' : ''}`}
          aria-live="polite"
          aria-hidden={!sentState}
        >
          {sentMessage}
        </p>
      </div>
    </section>
  );
};

export default DirectorPolicyDiscardPanel;
