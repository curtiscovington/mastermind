import type { HTMLAttributes } from 'react';
import './RoleNotice.css';

export type RoleNoticeRole = 'agency' | 'syndicate' | 'mastermind';

export type RoleNoticeProps = {
  open: boolean;
  role: RoleNoticeRole;
  onDismiss: () => void;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const roleConfig: Record<RoleNoticeRole, { name: string; sub?: string; iconClassName: string }> = {
  agency: { name: 'Agency Operative', sub: '[Loyalist]', iconClassName: 'fas fa-user' },
  syndicate: { name: 'Syndicate Operative', sub: '[Syndicate]', iconClassName: 'fas fa-user-secret' },
  mastermind: { name: 'Mastermind', sub: '[Mastermind]', iconClassName: 'fas fa-chess-king' },
};

const RoleNotice = ({ open, role, onDismiss, label = 'Role notification', className, ...rest }: RoleNoticeProps) => {
  const config = roleConfig[role];

  return (
    <section
      className={['mm-notice', open ? 'is-open' : '', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-hidden={!open}
      {...rest}
    >
      <button
        type="button"
        className="close-btn mm-notice__close"
        onClick={onDismiss}
        aria-label="Dismiss role notification"
        tabIndex={open ? 0 : -1}
      >
        <i className="fas fa-times" aria-hidden />
      </button>
      <div className="mm-avatar" aria-hidden>
        <i className={`${config.iconClassName} mm-avatar__icon`} aria-hidden />
      </div>
      <div className="mm-role">
        <p className="mm-role__label">You are:</p>
        <p className="mm-role__name">{config.name}</p>
        {config.sub ? <p className="mm-role__sub">{config.sub}</p> : null}
      </div>
    </section>
  );
};

export default RoleNotice;

