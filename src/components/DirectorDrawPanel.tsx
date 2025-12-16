import type { HTMLAttributes } from 'react';
import './CandidatesPanel.css';
import './DirectorDrawPanel.css';
import ActionButton from './ActionButton';

export type DirectorDrawPanelProps = {
  directorName: string;
  directorTitle?: string;
  prompt?: string;
  drawLabel?: string;
  disabled?: boolean;
  onDraw?: () => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const DirectorDrawPanel = ({
  directorName,
  directorTitle = 'Director',
  prompt = 'Draw policy cards',
  drawLabel = 'Draw policies',
  disabled = false,
  onDraw,
  label = 'Draw policies',
  className,
  ...rest
}: DirectorDrawPanelProps) => {
  return (
    <section className={['mm-draw', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className="mm-draw__header">
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

      <ActionButton variant="green" onClick={onDraw} disabled={disabled}>
        {drawLabel}
      </ActionButton>
    </section>
  );
};

export default DirectorDrawPanel;

