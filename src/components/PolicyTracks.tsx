import type { HTMLAttributes } from 'react';

export type PolicyTrackTeam = 'agency' | 'syndicate';

export type PolicyTrackConfig = {
  team: PolicyTrackTeam;
  total: number;
  filled: number;
  label?: string;
  iconClassName?: string;
};

export type PolicyTracksProps = {
  header?: string;
  tracks: PolicyTrackConfig[];
} & HTMLAttributes<HTMLElement>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultLabelForTeam: Record<PolicyTrackTeam, string> = {
  agency: 'Agency',
  syndicate: 'Syndicate',
};

const defaultIconForTeam: Record<PolicyTrackTeam, string> = {
  agency: 'fas fa-shield-alt',
  syndicate: 'fas fa-skull',
};

const PolicyTracks = ({ header = 'Policy Tracks', tracks, className, ...rest }: PolicyTracksProps) => {
  return (
    <section className={['mm-policy', className].filter(Boolean).join(' ')} aria-label="Policy tracks" {...rest}>
      <p className="mm-policy__header">{header}</p>

      {tracks.map((track) => {
        const label = track.label ?? defaultLabelForTeam[track.team];
        const iconClassName = track.iconClassName ?? defaultIconForTeam[track.team];
        const filled = clamp(track.filled, 0, track.total);

        return (
          <div key={track.team} className="mm-track">
            <div className="mm-track__icon" aria-hidden>
              <i className={`${iconClassName} mm-track__icon--${track.team}`} aria-hidden />
            </div>
            <div className={`mm-track__label mm-track__label--${track.team}`}>{label}</div>
            <div className="mm-track__bar" role="img" aria-label={`${label} track`}>
              {Array.from({ length: track.total }, (_, index) => (
                <span
                  key={`${track.team}-${index}`}
                  className={`mm-slot ${index < filled ? `mm-slot--${track.team}` : ''}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default PolicyTracks;

