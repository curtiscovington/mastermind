import type { HTMLAttributes } from 'react';
import CandidatesPanel, { type Candidate } from './CandidatesPanel';
import VotePanel, { type VoteChoice } from './VotePanel';
import './CandidatesVotePanel.css';

export type CandidatesVotePanelProps = {
  candidates: Candidate[];
  betweenLabel?: string;
  candidatesLabel?: string;
  voteValue?: VoteChoice | null;
  voteDefaultValue?: VoteChoice | null;
  onVoteChange?: (value: VoteChoice) => void;
  voteDisabled?: boolean;
  voteLockOnSelect?: boolean;
  voteLabel?: string;
  approveLabel?: string;
  rejectLabel?: string;
  castMessage?: string;
  animateIn?: boolean;
} & HTMLAttributes<HTMLElement>;

const CandidatesVotePanel = ({
  candidates,
  betweenLabel,
  candidatesLabel,
  voteValue,
  voteDefaultValue,
  onVoteChange,
  voteDisabled,
  voteLockOnSelect,
  voteLabel,
  approveLabel,
  rejectLabel,
  castMessage,
  animateIn = true,
  className,
  ...rest
}: CandidatesVotePanelProps) => {
  const isVoteCast = Boolean(voteValue);

  return (
    <section
      className={[
        'mm-candidates-vote',
        animateIn ? 'is-animating-in' : '',
        isVoteCast ? 'is-vote-cast' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <div className="mm-candidates-vote__nomination">
        <CandidatesPanel
          candidates={candidates}
          betweenLabel={betweenLabel}
          label={candidatesLabel}
          className="is-ring-centered"
        />
      </div>
      <div className="mm-candidates-vote__vote">
        <VotePanel
          value={voteValue}
          defaultValue={voteDefaultValue}
          onChange={onVoteChange}
          disabled={voteDisabled}
          lockOnSelect={voteLockOnSelect}
          label={voteLabel}
          approveLabel={approveLabel}
          rejectLabel={rejectLabel}
          castMessage={castMessage}
        />
      </div>
    </section>
  );
};

export default CandidatesVotePanel;
