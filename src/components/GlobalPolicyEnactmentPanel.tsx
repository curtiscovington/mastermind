import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import type { PolicyCard } from '../types';
import { getSyndicatePowerForPolicySlot } from '../utils/game';
import ActionButton from './ActionButton';
import SyndicatePowerIcon from './SyndicatePowerIcon';
import './CandidatesPanel.css';
import './GlobalPolicyEnactmentPanel.css';

export type GlobalPolicyEnactmentPanelProps = {
  globalName: string;
  globalTitle?: string;
  policies: PolicyCard[];
  syndicatePoliciesEnacted?: number;
  playerCount?: number;
  prompt?: string;
  enactLabel?: string;
  sentMessage?: string;
  sent?: boolean;
  exiting?: boolean;
  onEnact?: (enactedIndex: number) => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const labelForPolicy: Record<PolicyCard, string> = {
  agency: 'Agency',
  syndicate: 'Syndicate',
};

const GlobalPolicyEnactmentPanel = ({
  globalName,
  globalTitle = 'Global Operative',
  policies,
  syndicatePoliciesEnacted,
  playerCount = 6,
  prompt = 'Select a policy to enact',
  enactLabel = 'Enact',
  sentMessage = 'Policy enacted.',
  sent = false,
  exiting = false,
  onEnact,
  label = 'Policy enactment',
  className,
  ...rest
}: GlobalPolicyEnactmentPanelProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingSent, setPendingSent] = useState(false);
  const sentState = sent || pendingSent;
  const upcomingPower =
    syndicatePoliciesEnacted === undefined
      ? null
      : getSyndicatePowerForPolicySlot(syndicatePoliciesEnacted + 1, playerCount);

  const handleEnact = () => {
    if (selectedIndex === null) return;
    setPendingSent(true);
    onEnact?.(selectedIndex);
  };

  return (
    <section
      className={['mm-enact', sentState ? 'is-sent' : '', exiting ? 'is-exiting' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-nomination__header" aria-label="Global operative policy action">
        <div className="mm-player-row mm-player-row--global">
          <div className="mm-player-icon" aria-hidden>
            <i className="fas fa-user-secret" aria-hidden />
          </div>
          <div className="mm-player-info">
            <span className="mm-player-title">{globalTitle}</span>
            <span className="mm-player-name">{globalName}</span>
          </div>
        </div>

        <p className="mm-candidates-divider" aria-live="polite">
          {prompt}
        </p>
      </div>

      <div className="mm-enact__cards" role="list" aria-label="Policy cards">
        {policies.slice(0, 2).map((policy, index) => {
          const selected = selectedIndex === index;
          return (
            <div
              key={`${policy}-${index}`}
              role="listitem"
              className={['mm-policy-card', `mm-policy-card--${policy}`, selected ? 'is-selected' : '']
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

      <div className="mm-enact__actions">
        <ActionButton variant="green" onClick={handleEnact} disabled={sentState || selectedIndex === null || policies.length < 2}>
          {enactLabel}
        </ActionButton>
        <p className={`mm-enact__sent ${sentState ? 'is-visible' : ''}`} aria-live="polite" aria-hidden={!sentState}>
          {sentMessage}
        </p>
      </div>
    </section>
  );
};

export default GlobalPolicyEnactmentPanel;
