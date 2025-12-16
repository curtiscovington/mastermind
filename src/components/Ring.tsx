import type { HTMLAttributes } from 'react';
import './Ring.css';

export type RingProps = {
  showBackground?: boolean;
  clipContent?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const Ring = ({ showBackground = true, clipContent = false, className, children, ...rest }: RingProps) => {
  return (
    <div className={['mm-ring', clipContent ? 'mm-ring--clip' : '', className].filter(Boolean).join(' ')} {...rest}>
      {showBackground ? <div className="mm-ring__bg" aria-hidden /> : null}
      {children}
    </div>
  );
};

export default Ring;
