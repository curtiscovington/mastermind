import type { HTMLAttributes } from 'react';
import { useMemo, useState } from 'react';
import type { SyndicatePower } from '../types';
import ActionButton from './ActionButton';
import PlayerItem from './PlayerItem';
import SyndicatePowerIcon from './SyndicatePowerIcon';
import './CandidatesPanel.css';
import './DirectorPowersPanel.css';

export type PowerTarget = {
  id: string;
  name: string;
  isDirector?: boolean;
  disabled?: boolean;
};

export type DirectorPowersPanelProps = {
  directorName: string;
  directorTitle?: string;
  power: SyndicatePower;
  targets?: PowerTarget[];
  selection?: string | null;
  defaultSelection?: string | null;
  onSelectionChange?: (id: string) => void;
  sent?: boolean;
  exiting?: boolean;
  onResolve?: (power: SyndicatePower, targetId?: string) => void;
  prompt?: string;
  resolveLabel?: string;
  sentMessage?: string;
  label?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue' | 'value'>;

const powerCopy: Record<SyndicatePower, { title: string; description: string; defaultAction: string }> = {
  investigate: {
    title: 'Investigation',
    description: 'Peek at a player and privately learn if they are Agency or Syndicate-aligned.',
    defaultAction: 'Investigate',
  },
  surveillance: {
    title: 'Surveillance',
    description: 'View the top three policy cards and return them to the deck in any order.',
    defaultAction: 'Use surveillance',
  },
  special_election: {
    title: 'Special Election',
    description: 'Choose the next Director instead of passing the placard normally.',
    defaultAction: 'Assign Director',
  },
  purge: {
    title: 'Purge',
    description: 'Eliminate a player from the game immediately.',
    defaultAction: 'Purge',
  },
};

const powerNeedsTarget: Record<SyndicatePower, boolean> = {
  investigate: true,
  surveillance: false,
  special_election: true,
  purge: true,
};

const DirectorPowersPanel = ({
  directorName,
  directorTitle = 'Director',
  power,
  targets = [],
  selection,
  defaultSelection = null,
  onSelectionChange,
  sent = false,
  exiting = false,
  onResolve,
  prompt,
  resolveLabel,
  sentMessage = 'Power resolved.',
  label = 'Director powers',
  className,
  ...rest
}: DirectorPowersPanelProps) => {
  const [uncontrolledSelection, setUncontrolledSelection] = useState<string | null>(defaultSelection);
  const [pendingSent, setPendingSent] = useState(false);
  const sentState = sent || pendingSent;

  const isSelectionControlled = selection !== undefined;
  const currentSelection = isSelectionControlled ? selection : uncontrolledSelection;

  const copy = powerCopy[power];
  const requiresTarget = powerNeedsTarget[power];

  const promptText = useMemo(() => {
    if (prompt) return prompt;
    return requiresTarget ? 'Select a target' : 'Confirm to continue';
  }, [prompt, requiresTarget]);

  const actionLabel = resolveLabel ?? copy.defaultAction;
  const isConfirmDisabled = sentState || (requiresTarget && !currentSelection);

  const setSelection = (id: string) => {
    if (!isSelectionControlled) setUncontrolledSelection(id);
    onSelectionChange?.(id);
  };

  const handleResolve = () => {
    if (requiresTarget && !currentSelection) return;
    setPendingSent(true);
    onResolve?.(power, currentSelection ?? undefined);
  };

  return (
    <section
      className={['mm-powers', sentState ? 'is-sent' : '', exiting ? 'is-exiting' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-powers__header" aria-label="Director power">
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
          <span className="mm-powers__divider">
            <SyndicatePowerIcon power={power} />
            <span>{copy.title}</span>
          </span>
        </p>
      </div>

      <div className="mm-powers__body">
        <p className="mm-powers__description">{copy.description}</p>
        <p className="mm-powers__prompt" aria-live="polite">
          {promptText}
        </p>
      </div>

      {requiresTarget ? (
        <ul className="mml-list mm-powers__options" aria-label="Target list">
          {targets.map((target) => {
            const isSelected = target.id === currentSelection;
            const isDisabled = Boolean(target.disabled) || sentState;
            return (
              <PlayerItem
                key={target.id}
                title={target.name}
                isOwner={target.isDirector}
                className={[isSelected ? 'is-selected' : '', isDisabled ? 'is-disabled' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (isDisabled) return;
                  setSelection(target.id);
                }}
                onKeyDown={(event) => {
                  if (isDisabled) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelection(target.id);
                  }
                }}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
              />
            );
          })}
        </ul>
      ) : null}

      <ActionButton
        variant="green"
        className="mm-powers__confirm-btn"
        onClick={handleResolve}
        disabled={isConfirmDisabled}
      >
        {actionLabel}
      </ActionButton>

      <p className={`mm-powers__sent ${sentState ? 'is-visible' : ''}`} aria-live="polite" aria-hidden={!sentState}>
        {sentMessage}
      </p>
    </section>
  );
};

export default DirectorPowersPanel;

