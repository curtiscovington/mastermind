import type { HTMLAttributes } from 'react';
import './InstabilityMeter.css';

export type InstabilityMeterProps = {
  value: number;
  max: number;
  label?: string;
  showIcon?: boolean;
  pulseKey?: number;
} & HTMLAttributes<HTMLElement>;

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

const InstabilityMeter = ({
  value,
  max,
  label = 'Instability',
  showIcon = true,
  pulseKey = 0,
  className,
  ...rest
}: InstabilityMeterProps) => {
  const pct = max > 0 ? clampPct((value / max) * 100) : 0;

  return (
    <section className={['mm-instability', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      {pulseKey ? <div key={pulseKey} className="mm-instability__pulse" aria-hidden /> : null}
      <div className="mm-instability__top">
        <span>
          {label}: {value}/{max}
        </span>
        {showIcon ? <i className="fas fa-exclamation-triangle" aria-hidden /> : null}
      </div>
      <div className="mm-instability__bar" role="img" aria-label={`${label} meter`}>
        <div className="mm-instability__fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
};

export default InstabilityMeter;
