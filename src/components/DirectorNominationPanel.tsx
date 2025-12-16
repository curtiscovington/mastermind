import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import './CandidatesPanel.css';
import './DirectorNominationPanel.css';
import PlayerItem from './PlayerItem';
import ActionButton from './ActionButton';

export type Nominee = {
  id: string;
  name: string;
  title?: string;
};

export type DirectorNominationPanelProps = {
  directorName: string;
  directorTitle?: string;
  nominees: Nominee[];
  selection?: string | null;
  defaultSelection?: string | null;
  onSelectionChange?: (id: string) => void;
  nominationSent?: boolean;
  exiting?: boolean;
  onNominate?: (id: string) => void;
  disabled?: boolean;
  lockOnNominate?: boolean;
  prompt?: string;
  nominateLabel?: string;
  sentMessage?: string;
  label?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue' | 'value'>;

const DirectorNominationPanel = ({
  directorName,
  directorTitle = 'Director',
  nominees,
  selection,
  defaultSelection = null,
  onSelectionChange,
  nominationSent,
  exiting = false,
  onNominate,
  disabled = false,
  lockOnNominate = true,
  prompt = 'Select a nominee',
  nominateLabel = 'Nominate',
  sentMessage = 'Nomination sent.',
  label = 'Nomination',
  className,
  ...rest
}: DirectorNominationPanelProps) => {
  const [uncontrolledSelection, setUncontrolledSelection] = useState<string | null>(defaultSelection);
  const [uncontrolledSent, setUncontrolledSent] = useState(false);
  const [pendingSent, setPendingSent] = useState(false);

  const isSelectionControlled = selection !== undefined;
  const currentSelection = isSelectionControlled ? selection : uncontrolledSelection;

  const isSentControlled = nominationSent !== undefined;
  const isSent = isSentControlled ? nominationSent : uncontrolledSent;

  const setSelection = (id: string) => {
    if (!isSelectionControlled) {
      setUncontrolledSelection(id);
    }
    onSelectionChange?.(id);
  };

  const handleNominate = () => {
    if (!currentSelection) return;
    setPendingSent(true);
    onNominate?.(currentSelection);
    if (!isSentControlled) {
      setUncontrolledSent(true);
    }
  };

  const isSentState = isSent || pendingSent;
  const isLocked = isSentState && lockOnNominate;

  return (
    <section
      className={['mm-nomination', isSentState ? 'is-sent' : '', exiting ? 'is-exiting' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      {...rest}
    >
      <div className="mm-nomination__header" aria-label="Director nomination status">
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

      <ul className="mml-list mm-nomination__options" aria-label="Nominee list">
        {nominees.map((nominee) => {
          const isSelected = nominee.id === currentSelection;
          const isDisabled = disabled || isLocked;

          return (
            <PlayerItem
              key={nominee.id}
              title={nominee.name}
              className={[isSelected ? 'is-selected' : '', isDisabled ? 'is-disabled' : ''].filter(Boolean).join(' ')}
              onClick={() => {
                if (isDisabled) return;
                setSelection(nominee.id);
              }}
              onKeyDown={(event) => {
                if (isDisabled) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelection(nominee.id);
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

      <ActionButton
        variant="green"
        className="mm-nomination__confirm-btn"
        onClick={handleNominate}
        disabled={disabled || isLocked || !currentSelection}
      >
        {nominateLabel}
      </ActionButton>

      <p
        className={`mm-nomination__sent ${isSentState ? 'is-visible' : ''}`}
        aria-live="polite"
        aria-hidden={!isSentState}
      >
        {sentMessage}
      </p>
    </section>
  );
};

export default DirectorNominationPanel;
