import type { HTMLAttributes } from 'react';
import './AutoEnactmentPanel.css';
import ActionButton from './ActionButton';

export type AutoEnactmentPanelProps = {
  message?: string;
  enactLabel?: string;
  disabled?: boolean;
  onEnact?: () => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const AutoEnactmentPanel = ({
  message = 'Instability triggered an automatic policy enactment.',
  enactLabel = 'Auto-enact policy',
  disabled = false,
  onEnact,
  label = 'Auto enactment',
  className,
  ...rest
}: AutoEnactmentPanelProps) => {
  return (
    <section className={['mm-auto-enact', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className="mm-auto-enact__icon" aria-hidden>
        <i className="fas fa-exclamation-triangle" aria-hidden />
      </div>
      <p className="mm-auto-enact__message" role="status" aria-live="polite">
        {message}
      </p>
      <ActionButton variant="green" onClick={onEnact} disabled={disabled}>
        {enactLabel}
      </ActionButton>
    </section>
  );
};

export default AutoEnactmentPanel;

