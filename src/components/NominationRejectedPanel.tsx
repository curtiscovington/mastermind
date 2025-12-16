import type { HTMLAttributes } from 'react';
import { useEffect } from 'react';
import './NominationRejectedPanel.css';

export type NominationRejectedPanelProps = {
  autoDismissMs?: number;
  onDismiss?: () => void;
  label?: string;
  title?: string;
  detail?: string;
} & HTMLAttributes<HTMLElement>;

const NominationRejectedPanel = ({
  autoDismissMs = 2400,
  onDismiss,
  label = 'Nomination rejected',
  title = 'Nomination rejected',
  detail = '',
  className,
  ...rest
}: NominationRejectedPanelProps) => {
  useEffect(() => {
    if (!onDismiss) return;
    const id = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(id);
  }, [autoDismissMs, onDismiss]);

  return (
    <section className={['mm-rejected', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className="mm-rejected__icon" aria-hidden>
        <i className="fas fa-times" aria-hidden />
      </div>
      <p className="mm-rejected__title">{title}</p>
      <p className="mm-rejected__detail">{detail}</p>
    </section>
  );
};

export default NominationRejectedPanel;

