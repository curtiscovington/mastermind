import type { HTMLAttributes } from 'react';
import type { SyndicatePower } from '../types';
import './SyndicatePowerIcon.css';

export type SyndicatePowerIconProps = {
  power: SyndicatePower;
  title?: string;
  label?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

const powerTitle: Record<SyndicatePower, string> = {
  investigate: 'Investigation',
  surveillance: 'Surveillance',
  special_election: 'Special Election',
  purge: 'Purge',
};

const iconPath: Record<SyndicatePower, string> = {
  investigate:
    'M10 4a6 6 0 104.47 10.02l3.25 3.25a1 1 0 001.41-1.41l-3.25-3.25A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z',
  surveillance:
    'M12 5c5.5 0 9.74 4.22 10.9 6.1a1.8 1.8 0 010 1.8C21.74 14.78 17.5 19 12 19S2.26 14.78 1.1 12.9a1.8 1.8 0 010-1.8C2.26 9.22 6.5 5 12 5zm0 3.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z',
  special_election:
    'M7 2h10a2 2 0 012 2v18l-7-4-7 4V4a2 2 0 012-2zm2 6h6v2H9V8zm0 4h6v2H9v-2z',
  purge:
    'M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9z',
};

const SyndicatePowerIcon = ({ power, title, label, className, ...rest }: SyndicatePowerIconProps) => {
  const accessibleLabel = label ?? powerTitle[power];
  return (
    <span
      className={['mm-power-icon', className].filter(Boolean).join(' ')}
      title={title ?? accessibleLabel}
      aria-label={accessibleLabel}
      role="img"
      {...rest}
    >
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <path d={iconPath[power]} />
      </svg>
    </span>
  );
};

export default SyndicatePowerIcon;

