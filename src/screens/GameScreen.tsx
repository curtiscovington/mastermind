import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Player, Room, SyndicatePower, Team, VoteChoice } from '../types';
import { getUnlockedSyndicatePowers } from '../utils/game';
import Ring from '../components/Ring';
import RoleNotice from '../components/RoleNotice';
import PlayersNotice from '../components/PlayersNotice';
import PolicyTracks from '../components/PolicyTracks';
import InstabilityMeter from '../components/InstabilityMeter';
import DirectorNominationPanel from '../components/DirectorNominationPanel';
import NominationWaitingPanel from '../components/NominationWaitingPanel';
import CandidatesVotePanel from '../components/CandidatesVotePanel';
import DirectorPolicyDiscardPanel from '../components/DirectorPolicyDiscardPanel';
import GlobalPolicyEnactmentPanel from '../components/GlobalPolicyEnactmentPanel';
import DirectorPowersPanel from '../components/DirectorPowersPanel';
import ActionWaitingPanel from '../components/ActionWaitingPanel';
import DirectorDrawPanel from '../components/DirectorDrawPanel';
import AutoEnactmentPanel from '../components/AutoEnactmentPanel';
import InvestigationNotice from '../components/InvestigationNotice';
import './MastermindMockScreen.css';

type Props = {
  room: Room;
  players: Player[];
  clientId: string;
  onNominateDeputy: (deputyId: string) => Promise<void>;
  onSubmitVote: (choice: VoteChoice) => Promise<void>;
  onDrawPolicies: () => Promise<void>;
  onDirectorDiscard: (cardIndex: number) => Promise<void>;
  onDeputyEnact: (cardIndex: number) => Promise<void>;
  onAutoEnactPolicy: () => Promise<void>;
  onInvestigatePlayer: (
    playerId: string,
  ) => Promise<{ playerId: string; team: Team | null } | null>;
  onUseSurveillance: () => Promise<void>;
  onSpecialElection: (directorId: string) => Promise<void>;
  onPurgePlayer: (playerId: string) => Promise<void>;
  busyAction: string | null;
};

const roleNoticeRoleFor = (player: Player | undefined) => {
  if (player?.role === 'mastermind') return 'mastermind';
  if (player?.team === 'syndicate') return 'syndicate';
  return 'agency';
};

const iconForPlayer = (room: Room, player: Player) => {
  if (player.role === 'mastermind') return 'fas fa-chess-king';
  if (player.id === room.directorId || player.id === room.directorCandidateId) return 'fas fa-user-tie';
  if (player.id === room.deputyId || player.id === room.deputyCandidateId) return 'fas fa-user-secret';
  if (player.role === 'syndicate_agent') return 'fas fa-user-secret';
  return 'fas fa-user';
};

const GameScreen = ({
  room,
  players,
  clientId,
  onNominateDeputy,
  onSubmitVote,
  onDrawPolicies,
  onDirectorDiscard,
  onDeputyEnact,
  onAutoEnactPolicy,
  onInvestigatePlayer,
  onUseSurveillance,
  onSpecialElection,
  onPurgePlayer,
  busyAction,
}: Props) => {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [deputySelections, setDeputySelections] = useState<Record<number, string>>({});
  const [drawnRounds, setDrawnRounds] = useState<Record<number, boolean>>({});
  const [instabilityPulseKey, setInstabilityPulseKey] = useState(0);
  const [investigationReveal, setInvestigationReveal] = useState<{
    targetName: string;
    team: Team | null;
  } | null>(null);

  const you = useMemo(() => players.find((player) => player.clientId === clientId), [clientId, players]);
  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players]);

  const directorCandidate = useMemo(
    () => players.find((player) => player.id === room.directorCandidateId),
    [players, room.directorCandidateId],
  );
  const deputyCandidate = useMemo(
    () => players.find((player) => player.id === room.deputyCandidateId),
    [players, room.deputyCandidateId],
  );
  const director = useMemo(
    () => players.find((player) => player.id === room.directorId),
    [players, room.directorId],
  );
  const deputy = useMemo(
    () => players.find((player) => player.id === room.deputyId),
    [players, room.deputyId],
  );

  const directorName =
    directorCandidate?.displayName?.trim() ||
    director?.displayName?.trim() ||
    players.find((player) => player.id === room.directorId)?.displayName?.trim() ||
    'Director';
  const globalName =
    deputyCandidate?.displayName?.trim() ||
    deputy?.displayName?.trim() ||
    players.find((player) => player.id === room.deputyId)?.displayName?.trim() ||
    'Global Operative';

  const isDirectorCandidate = you?.id === room.directorCandidateId;
  const isDirector = you?.id === room.directorId;
  const isDeputy = you?.id === room.deputyId;
  const isEliminated = Boolean(you && !you.alive);

  const voteTallies = room.voteTallies ?? {};
  const yourVote = you?.id ? (voteTallies[you.id] ?? null) : null;
  const hasVoted = Boolean(yourVote);

  const instability = room.instabilityCount ?? 0;
  const syndicateEnacted = room.syndicatePoliciesEnacted ?? 0;
  const agencyEnacted = room.agencyPoliciesEnacted ?? 0;
  const previousInstability = useRef(instability);

  const directorHand = room.directorHand ?? [];
  const deputyHand = room.deputyHand ?? [];

  const resolvedPowers = (room.syndicatePowersResolved ?? []) as SyndicatePower[];
  const unlockedPowers = useMemo(
    () => getUnlockedSyndicatePowers(syndicateEnacted, players.length),
    [players.length, syndicateEnacted],
  );
  const pendingPowers = unlockedPowers.filter((power) => !resolvedPowers.includes(power));
  const pendingPower = pendingPowers[0] ?? null;

  const canUsePowers = isDirector && room.phase === 'enactment' && !room.autoEnactment;
  const shouldShowPowers = Boolean(pendingPower) && room.phase === 'enactment' && !room.autoEnactment;

  const selectedDeputyId = deputySelections[room.round] ?? '';
  const hasDrawnThisRound = drawnRounds[room.round] ?? false;

  useEffect(() => {
    if (directorHand.length) {
      setDrawnRounds((prev) => ({ ...prev, [room.round]: true }));
    }
  }, [directorHand.length, room.round]);

  useEffect(() => {
    if (previousInstability.current === instability) return;
    previousInstability.current = instability;
    setInstabilityPulseKey((key) => key + 1);
  }, [instability]);

  const playersNoticeList = useMemo(
    () =>
      players.map((player) => ({
        id: player.id,
        name: player.displayName || 'Unknown',
        iconClassName: iconForPlayer(room, player),
      })),
    [players, room],
  );

  const powerTargets = useMemo(
    () =>
      alivePlayers
        .filter((player) => player.id !== you?.id)
        .map((player) => ({
          id: player.id,
          name: player.displayName || 'Unknown',
          isDirector: player.id === room.directorId,
        })),
    [alivePlayers, room.directorId, you?.id],
  );

  const handleResolvePower = async (power: SyndicatePower, targetId?: string) => {
    if (power === 'investigate') {
      if (!targetId) return;
      const result = await onInvestigatePlayer(targetId);
      if (!result) return;
      const target = players.find((player) => player.id === result.playerId);
      setInvestigationReveal({
        targetName: target?.displayName ?? 'Unknown agent',
        team: result.team,
      });
      return;
    }

    if (power === 'surveillance') {
      await onUseSurveillance();
      return;
    }

    if (power === 'special_election') {
      if (!targetId) return;
      await onSpecialElection(targetId);
      return;
    }

    if (power === 'purge') {
      if (!targetId) return;
      await onPurgePlayer(targetId);
    }
  };

  let centerPanel: ReactNode = null;

  if (room.phase === 'nomination') {
    const nominees = alivePlayers
      .filter((player) => player.id !== room.directorCandidateId)
      .filter((player) => (room.previousDirectorId ? player.id !== room.previousDirectorId : true))
      .map((player) => ({ id: player.id, name: player.displayName || 'Unknown' }));

    if (isDirectorCandidate && you?.alive) {
      centerPanel = (
        <DirectorNominationPanel
          directorName={directorName}
          nominees={nominees}
          selection={selectedDeputyId || null}
          onSelectionChange={(id) =>
            setDeputySelections((prev) => ({
              ...prev,
              [room.round]: id,
            }))
          }
          onNominate={(id) => {
            void onNominateDeputy(id);
          }}
          disabled={busyAction === 'nominate'}
        />
      );
    } else {
      centerPanel = <NominationWaitingPanel directorName={directorName} message="Waiting for nomination" />;
    }
  } else if (room.phase === 'voting') {
    centerPanel = (
      <CandidatesVotePanel
        betweenLabel="Nominates"
        candidates={[
          { id: 'director', role: 'director', title: 'Director', name: directorCandidate?.displayName ?? 'Unknown' },
          { id: 'global', role: 'global', title: 'Global Operative', name: deputyCandidate?.displayName ?? 'Unknown' },
        ]}
        voteValue={yourVote}
        onVoteChange={(choice) => {
          void onSubmitVote(choice);
        }}
        voteDisabled={isEliminated || hasVoted || busyAction === 'vote'}
      />
    );
  } else if (room.phase === 'enactment') {
    if (room.autoEnactment) {
      centerPanel = (
        <AutoEnactmentPanel
          disabled={busyAction === 'auto-enact'}
          enactLabel={busyAction === 'auto-enact' ? 'Auto-enacting…' : 'Auto-enact policy'}
          onEnact={() => void onAutoEnactPolicy()}
        />
      );
    } else if (shouldShowPowers && pendingPower) {
      if (canUsePowers) {
        centerPanel = (
          <DirectorPowersPanel
            key={`${room.round}-${pendingPower}`}
            directorName={directorName}
            power={pendingPower}
            targets={powerTargets}
            onResolve={(power, targetId) => {
              void handleResolvePower(power, targetId);
            }}
          />
        );
      } else {
        centerPanel = (
          <ActionWaitingPanel role="director" name={directorName} message="Waiting for Director to resolve powers…" />
        );
      }
    } else if (directorHand.length === 0 && deputyHand.length === 0) {
      if (isDirector && you?.alive) {
        if (hasDrawnThisRound) {
          centerPanel = <ActionWaitingPanel role="director" name={directorName} message="Waiting for policies…" />;
        } else {
          centerPanel = (
            <DirectorDrawPanel
              directorName={directorName}
              disabled={busyAction === 'draw'}
              drawLabel={busyAction === 'draw' ? 'Drawing…' : 'Draw policies'}
              onDraw={() => {
                setDrawnRounds((prev) => ({ ...prev, [room.round]: true }));
                void onDrawPolicies();
              }}
            />
          );
        }
      } else {
        centerPanel = (
          <ActionWaitingPanel role="director" name={directorName} message="Waiting for Director to draw policies…" />
        );
      }
    } else if (directorHand.length === 3) {
      if (isDirector && you?.alive) {
        centerPanel = (
          <DirectorPolicyDiscardPanel
            key={`${room.round}-discard`}
            directorName={directorName}
            policies={directorHand}
            syndicatePoliciesEnacted={syndicateEnacted}
            playerCount={players.length}
            onDiscard={(index) => {
              void onDirectorDiscard(index);
            }}
          />
        );
      } else {
        centerPanel = <ActionWaitingPanel role="director" name={directorName} message="Waiting for Director to discard…" />;
      }
    } else if (deputyHand.length === 2) {
      if (isDeputy && you?.alive) {
        centerPanel = (
          <GlobalPolicyEnactmentPanel
            key={`${room.round}-enact`}
            globalName={globalName}
            policies={deputyHand}
            syndicatePoliciesEnacted={syndicateEnacted}
            playerCount={players.length}
            onEnact={(index) => {
              void onDeputyEnact(index);
            }}
          />
        );
      } else {
        centerPanel = (
          <ActionWaitingPanel
            role="global"
            name={globalName}
            message="Waiting for Global Operative to enact a policy…"
          />
        );
      }
    } else {
      centerPanel = <ActionWaitingPanel role="director" name={directorName} message="Resolving the table…" />;
    }
  } else {
    centerPanel = <ActionWaitingPanel role="director" name={directorName} message="Waiting for the next phase…" />;
  }

  return (
    <div className="mm-frame" aria-label="Mastermind game">
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

          <RoleNotice open={noticeOpen} role={roleNoticeRoleFor(you)} onDismiss={() => setNoticeOpen(false)} />
          <PlayersNotice open={playersOpen} onDismiss={() => setPlayersOpen(false)} players={playersNoticeList} />
          {investigationReveal ? (
            <InvestigationNotice
              open={Boolean(investigationReveal)}
              targetName={investigationReveal.targetName}
              team={investigationReveal.team}
              onDismiss={() => setInvestigationReveal(null)}
            />
          ) : null}
        </div>
      </header>

      <main className="mm-dashboard" aria-label="Dashboard">
        <Ring clipContent={room.phase === 'nomination'}>{centerPanel}</Ring>
      </main>

      <footer className="mm-bottom" aria-label="Policy tracks and instability">
        <PolicyTracks
          tracks={[
            { team: 'agency', total: 5, filled: agencyEnacted },
            { team: 'syndicate', total: 6, filled: syndicateEnacted },
          ]}
        />
        <InstabilityMeter value={instability} max={3} pulseKey={instabilityPulseKey} />
      </footer>
    </div>
  );
};

export default GameScreen;
