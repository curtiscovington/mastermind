import type { HTMLAttributes } from 'react';
import './RoleNotice.css';
import './PlayersNotice.css';

export type PlayersNoticePlayer = {
  id: string;
  name: string;
  iconClassName?: string;
  tag?: string;
  tagClassName?: string;
};

export type PlayersNoticeProps = {
  open: boolean;
  players: PlayersNoticePlayer[];
  onDismiss: () => void;
  label?: string;
  title?: string;
} & HTMLAttributes<HTMLElement>;

const PlayersNotice = ({
  open,
  players,
  onDismiss,
  label = 'Players',
  title = 'Players',
  className,
  ...rest
}: PlayersNoticeProps) => {
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
        aria-label="Dismiss players"
        tabIndex={open ? 0 : -1}
      >
        <i className="fas fa-times" aria-hidden />
      </button>

      <div className="mm-avatar" aria-hidden>
        <i className="fas fa-users mm-avatar__icon" aria-hidden />
      </div>

      <div className="mm-players-notice__content">
        <p className="mm-players-notice__title">{title}</p>
        <ul className="mm-players-notice__list" aria-label="Player list">
          {players.map((player) => (
            <li key={player.id} className="mm-players-notice__row">
              <div className="mm-players-notice__icon" aria-hidden>
                <i className={player.iconClassName ?? 'fas fa-user'} aria-hidden />
              </div>
              <div className="mm-players-notice__meta">
                <p className="mm-players-notice__name">{player.name}</p>
                {player.tag ? (
                  <span
                    className={[
                      'mm-players-notice__tag',
                      player.tagClassName ? player.tagClassName : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {player.tag}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PlayersNotice;
