import { useEffect, useRef, useState } from 'react';
import './MastermindMockScreen.css';
import CandidatesVotePanel from '../components/CandidatesVotePanel';
import DirectorPolicyDiscardPanel from '../components/DirectorPolicyDiscardPanel';
import ActionWaitingPanel from '../components/ActionWaitingPanel';
import GlobalPolicyEnactmentPanel from '../components/GlobalPolicyEnactmentPanel';
import GameWonPanel from '../components/GameWonPanel';
import InstabilityMeter from '../components/InstabilityMeter';
import DirectorNominationPanel from '../components/DirectorNominationPanel';
import NominationRejectedPanel from '../components/NominationRejectedPanel';
import PolicyTracks from '../components/PolicyTracks';
import RoleNotice from '../components/RoleNotice';
import PlayersNotice from '../components/PlayersNotice';
import Ring from '../components/Ring';
import DirectorPowersPanel from '../components/DirectorPowersPanel';
import { getSyndicatePowerForPolicySlot } from '../utils/game';
import type { SyndicatePower } from '../types';

const MastermindMockScreen = () => {
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [phase, setPhase] = useState<
    'nominate' | 'vote' | 'rejected' | 'discard' | 'waiting' | 'enact' | 'powers' | 'won'
  >('nominate');
  const [nominationSent, setNominationSent] = useState(false);
  const [nominationExiting, setNominationExiting] = useState(false);
  const [voteChoice, setVoteChoice] = useState<'approve' | 'reject' | null>(null);
  const [discardSent, setDiscardSent] = useState(false);
  const [discardExiting, setDiscardExiting] = useState(false);
  const [enactSent, setEnactSent] = useState(false);
  const [enactExiting, setEnactExiting] = useState(false);
  const [pendingPower, setPendingPower] = useState<SyndicatePower | null>(null);
  const [powerSent, setPowerSent] = useState(false);
  const [powerExiting, setPowerExiting] = useState(false);
  const timeoutIds = useRef<number[]>([]);

  const [instability, setInstability] = useState(1);
  const [instabilityPulseKey, setInstabilityPulseKey] = useState(0);
  const instabilityMax = 3;
  const rejectionHandled = useRef(false);
  const approvalHandled = useRef(false);
  const [agencyPoliciesEnacted, setAgencyPoliciesEnacted] = useState(3);
  const [syndicatePoliciesEnacted, setSyndicatePoliciesEnacted] = useState(2);
  const playerCount = 5;
  const [winState, setWinState] = useState<
    | { winner: 'agency'; reason: 'policy' }
    | { winner: 'syndicate'; reason: 'policy' | 'mastermind_vote' }
    | null
  >(null);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => window.clearTimeout(id));
      timeoutIds.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase !== 'vote') {
      rejectionHandled.current = false;
      approvalHandled.current = false;
      return;
    }

    if (voteChoice !== 'reject' || rejectionHandled.current) return;

    rejectionHandled.current = true;
    timeoutIds.current.push(
      window.setTimeout(() => {
        setInstability((value) => Math.min(instabilityMax, value + 1));
        setInstabilityPulseKey((value) => value + 1);
        setPhase('rejected');
      }, 3000),
    );
  }, [phase, voteChoice]);

  useEffect(() => {
    if (phase !== 'vote') return;
    if (voteChoice !== 'approve' || approvalHandled.current) return;

    approvalHandled.current = true;
    timeoutIds.current.push(
      window.setTimeout(() => {
        setPhase('discard');
      }, 3000),
    );
  }, [phase, voteChoice]);

  const handleNominate = () => {
    setNominationSent(true);
    timeoutIds.current.push(
      window.setTimeout(() => {
        setNominationExiting(true);
      }, 3000),
    );
    timeoutIds.current.push(
      window.setTimeout(() => {
        setPhase('vote');
      }, 3400),
    );
  };

  const resetToNominate = () => {
    setVoteChoice(null);
    setNominationSent(false);
    setNominationExiting(false);
    setDiscardSent(false);
    setDiscardExiting(false);
    setEnactSent(false);
    setEnactExiting(false);
    setPendingPower(null);
    setPowerSent(false);
    setPowerExiting(false);
    setPhase('nominate');
  };

  const handleDiscard = () => {
    setDiscardSent(true);
    timeoutIds.current.push(
      window.setTimeout(() => {
        setDiscardExiting(true);
      }, 900),
    );
    timeoutIds.current.push(
      window.setTimeout(() => {
        setPhase('waiting');
      }, 1300),
    );
  };

  const handleEnact = (enactedIndex: number) => {
    setEnactSent(true);

    const policies = ['agency', 'syndicate'] as const;
    const enacted = policies[enactedIndex];
    const triggeredPower =
      enacted === 'syndicate'
        ? getSyndicatePowerForPolicySlot(Math.min(6, syndicatePoliciesEnacted + 1), playerCount)
        : null;

    if (enacted === 'agency') {
      setAgencyPoliciesEnacted((value) => {
        const next = Math.min(5, value + 1);
        if (next >= 5) {
          setWinState({ winner: 'agency', reason: 'policy' });
          setPhase('won');
        }
        return next;
      });
    } else {
      setSyndicatePoliciesEnacted((value) => {
        const next = Math.min(6, value + 1);
        if (next >= 6) {
          setWinState({ winner: 'syndicate', reason: 'policy' });
          setPhase('won');
        }
        return next;
      });
    }

    if ((enacted === 'agency' && agencyPoliciesEnacted + 1 >= 5) || (enacted === 'syndicate' && syndicatePoliciesEnacted + 1 >= 6)) {
      return;
    }

    timeoutIds.current.push(
      window.setTimeout(() => {
        setEnactExiting(true);
      }, 900),
    );
    timeoutIds.current.push(
      window.setTimeout(() => {
        if (triggeredPower) {
          setPendingPower(triggeredPower);
          setPhase('powers');
          setPowerSent(false);
          setPowerExiting(false);
        } else {
          resetToNominate();
        }
      }, 1300),
    );
  };

  useEffect(() => {
    if (phase !== 'waiting') return;

    timeoutIds.current.push(
      window.setTimeout(() => {
        setPhase('enact');
      }, 3000),
    );
  }, [phase]);

  return (
    <div className="mm-frame" aria-label="Mastermind UI mock">
      <header className="mm-top" aria-label="Notifications and menu">
        <div className="mm-top-actions">
          <button
            type="button"
            className="mm-icon-btn"
            aria-label="Show identity"
            onClick={() => {
              setPlayersOpen(false);
              setNoticeOpen(true);
            }}
          >
            <i className="fas fa-id-badge" aria-hidden />
          </button>

          <button
            type="button"
            className="mm-icon-btn"
            aria-label="Show players"
            onClick={() => {
              setNoticeOpen(false);
              setPlayersOpen(true);
            }}
          >
            <i className="fas fa-users" aria-hidden />
          </button>

          <RoleNotice open={noticeOpen} role="agency" onDismiss={() => setNoticeOpen(false)} />
          <PlayersNotice
            open={playersOpen}
            onDismiss={() => setPlayersOpen(false)}
            players={[
              { id: 'p1', name: 'Agent_K', iconClassName: 'fas fa-user-tie' },
              { id: 'p2', name: 'Cipher_X', iconClassName: 'fas fa-user-secret' },
              { id: 'p3', name: 'Violet_7' },
              { id: 'p4', name: 'Nova_9' },
              { id: 'p5', name: 'Echo_3' },
            ]}
          />
        </div>
      </header>

      <main className="mm-dashboard" aria-label="Dashboard">
        <Ring clipContent={phase === 'nominate'}>
          {phase === 'nominate' ? (
            <DirectorNominationPanel
              directorName="Agent_K"
              nominees={[
                { id: 'p2', name: 'Cipher_X', title: 'Global Operative' },
                { id: 'p3', name: 'Violet_7' },
                { id: 'p4', name: 'Nova_9' },
                { id: 'p5', name: 'Echo_3' },
              ]}
              nominationSent={nominationSent}
              exiting={nominationExiting}
              onNominate={handleNominate}
            />
          ) : phase === 'vote' ? (
            <CandidatesVotePanel
              key="vote"
              betweenLabel="Nominates"
              candidates={[
                { id: 'director', role: 'director', title: 'Director', name: 'Agent_K' },
                { id: 'global', role: 'global', title: 'Global Operative', name: 'Cipher_X' },
              ]}
              voteValue={voteChoice}
              onVoteChange={(choice) => setVoteChoice(choice)}
            />
          ) : phase === 'discard' ? (
            <DirectorPolicyDiscardPanel
              key="discard"
              directorName="Agent_K"
              syndicatePoliciesEnacted={syndicatePoliciesEnacted}
              playerCount={playerCount}
              policies={['agency', 'syndicate', 'syndicate']}
              sent={discardSent}
              exiting={discardExiting}
              onDiscard={handleDiscard}
            />
          ) : phase === 'waiting' ? (
            <ActionWaitingPanel
              key="waiting"
              role="global"
              name="Cipher_X"
              message="Waiting for Global Operative to enact a policy…"
            />
          ) : phase === 'enact' ? (
            <GlobalPolicyEnactmentPanel
              key="enact"
              globalName="Cipher_X"
              syndicatePoliciesEnacted={syndicatePoliciesEnacted}
              playerCount={playerCount}
              policies={['agency', 'syndicate']}
              sent={enactSent}
              exiting={enactExiting}
              onEnact={handleEnact}
            />
          ) : phase === 'powers' && pendingPower ? (
            <DirectorPowersPanel
              key="powers"
              directorName="Agent_K"
              power={pendingPower}
              targets={[
                { id: 'p2', name: 'Cipher_X' },
                { id: 'p3', name: 'Violet_7' },
                { id: 'p4', name: 'Nova_9' },
                { id: 'p5', name: 'Echo_3' },
              ]}
              sent={powerSent}
              exiting={powerExiting}
              onResolve={() => {
                setPowerSent(true);
                timeoutIds.current.push(
                  window.setTimeout(() => {
                    setPowerExiting(true);
                  }, 900),
                );
                timeoutIds.current.push(
                  window.setTimeout(() => {
                    resetToNominate();
                  }, 1300),
                );
              }}
            />
          ) : phase === 'won' && winState ? (
            winState.winner === 'agency' ? (
              <GameWonPanel key="won" winner="agency" reason="policy" />
            ) : (
              <GameWonPanel
                key="won"
                winner="syndicate"
                reason={winState.reason}
                mastermindName="Cipher_X"
                syndicateMembers={['Violet_7', 'Echo_3']}
              />
            )
          ) : (
            <NominationRejectedPanel
              key="rejected"
              detail=""
              onDismiss={() => {
                resetToNominate();
              }}
            />
          )}
        </Ring>
      </main>

      <footer className="mm-bottom" aria-label="Policy tracks and instability">
        <PolicyTracks
          tracks={[
            { team: 'agency', total: 5, filled: agencyPoliciesEnacted },
            { team: 'syndicate', total: 6, filled: syndicatePoliciesEnacted },
          ]}
        />

        <InstabilityMeter value={instability} max={instabilityMax} pulseKey={instabilityPulseKey} />
      </footer>
    </div>
  );
};

export default MastermindMockScreen;
