import type { ButtonHTMLAttributes } from 'react';
import './ActionButton.css';

export type ActionButtonVariant = 'green' | 'red';
export type ActionButtonKind = 'mm' | 'lobbyPrimary';

export type ActionButtonProps = {
  variant: ActionButtonVariant;
  kind?: ActionButtonKind;
  selected?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  };

const classNameFor = (kind: ActionButtonKind, variant: ActionButtonVariant) => {
  if (kind === 'lobbyPrimary') return 'mml-btn mml-btn--primary';
  return variant === 'green' ? 'mm-btn mm-btn--approve' : 'mm-btn mm-btn--reject';
};

const ActionButton = ({ variant, kind = 'mm', selected, className, type = 'button', ...rest }: ActionButtonProps) => {
  return (
    <button
      type={type}
      className={[classNameFor(kind, variant), selected ? 'is-selected' : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
};

export default ActionButton;
