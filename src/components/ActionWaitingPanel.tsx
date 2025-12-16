import type { HTMLAttributes } from 'react';
import './CandidatesPanel.css';
import './ActionWaitingPanel.css';

export type ActionWaitingRole = 'director' | 'global';

export type ActionWaitingPanelProps = {
  role: ActionWaitingRole;
  name: string;
  title?: string;
  message?: string;
  label?: string;
} & HTMLAttributes<HTMLElement>;

const defaultTitle: Record<ActionWaitingRole, string> = {
  director: 'Director',
  global: 'Global Operative',
};

const defaultMessage: Record<ActionWaitingRole, string> = {
  director: 'Waiting for Director…',
  global: 'Waiting for Global Operative…',
};

const defaultIcon: Record<ActionWaitingRole, string> = {
  director: 'fas fa-user-tie',
  global: 'fas fa-user-secret',
};

const ActionWaitingPanel = ({
  role,
  name,
  title,
  message,
  label = 'Waiting for action',
  className,
  ...rest
}: ActionWaitingPanelProps) => {
  const resolvedTitle = title ?? defaultTitle[role];
  const resolvedMessage = message ?? defaultMessage[role];

  return (
    <section className={['mm-wait', className].filter(Boolean).join(' ')} aria-label={label} {...rest}>
      <div className={`mm-player-row mm-player-row--${role === 'global' ? 'global' : 'director'}`}>
        <div className="mm-player-icon" aria-hidden>
          <i className={defaultIcon[role]} aria-hidden />
        </div>
        <div className="mm-player-info">
          <span className="mm-player-title">{resolvedTitle}</span>
          <span className="mm-player-name">{name}</span>
        </div>
      </div>

      <p className="mm-wait__message" role="status" aria-live="polite">
        {resolvedMessage}
      </p>
    </section>
  );
};

export default ActionWaitingPanel;

