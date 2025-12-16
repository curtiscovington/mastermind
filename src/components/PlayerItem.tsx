import type { ButtonHTMLAttributes, LiHTMLAttributes } from 'react';
import './PlayerItem.css';

type PlayerItemBaseProps = {
  title: string;
  isOwner?: boolean;
  isYou?: boolean;
  showReadyRing?: boolean;
};

type PlayerItemLiProps = {
  as?: 'li';
} & Omit<LiHTMLAttributes<HTMLLIElement>, 'title'>;

type PlayerItemButtonProps = {
  as: 'button';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'>;

export type PlayerItemProps = PlayerItemBaseProps & (PlayerItemLiProps | PlayerItemButtonProps);

const PlayerItem = ({ title, isOwner, isYou, showReadyRing, as, className, ...rest }: PlayerItemProps) => {
  const classes = ['mml-player', isYou ? 'is-you' : '', className].filter(Boolean).join(' ');
  const avatarClasses = ['mml-avatar', showReadyRing ? 'mml-avatar--ready' : ''].filter(Boolean).join(' ');
  const iconClasses = `fas ${isOwner ? 'fa-user-tie' : 'fa-user'}`;

  if (as === 'button') {
    const buttonProps = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'>;
    return (
      <button className={classes} {...buttonProps}>
        <div className={avatarClasses} aria-hidden>
          <i className={iconClasses} aria-hidden />
        </div>
        <p className="mml-player__name">{title}</p>
      </button>
    );
  }

  const liProps = rest as Omit<LiHTMLAttributes<HTMLLIElement>, 'title'>;
  return (
    <li className={classes} {...liProps}>
      <div className={avatarClasses} aria-hidden>
        <i className={iconClasses} aria-hidden />
      </div>
      <p className="mml-player__name">{title}</p>
    </li>
  );
};

export default PlayerItem;
