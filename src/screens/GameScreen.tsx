import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { GamePhase, Player, Room, SyndicatePower, VoteChoice } from '../types';
import { getUnlockedSyndicatePowers } from '../utils/game';

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
  onInvestigatePlayer: (playerId: string) => Promise<void>;
  onUseSurveillance: () => Promise<void>;
  onSpecialElection: (directorId: string) => Promise<void>;
  onPurgePlayer: (playerId: string) => Promise<void>;
  busyAction: string | null;
};

const roleCopy: Record<string, string> = {
  mastermind: 'You are the MASTERMIND. Steer the Syndicate to victory.',
  syndicate_agent: 'You are a Syndicate Agent working with the Mastermind.',
  agency: 'You are Agency. Expose the Mastermind.',
};

const phaseThemes: Record<
  GamePhase,
  { icon: string; label: string; gradient: string; accent: string; glow: string }
> = {
  lobby: {
    icon: '🛠️',
    label: 'Lobby',
    gradient: 'linear-gradient(120deg, rgba(125, 214, 255, 0.35), rgba(101, 255, 207, 0.24), rgba(125, 214, 255, 0.35))',
    accent: 'rgba(125, 214, 255, 0.45)',
    glow: 'rgba(111, 212, 255, 0.4)',
  },
  nomination: {
    icon: '🎯',
    label: 'Nomination',
    gradient: 'linear-gradient(120deg, rgba(255, 195, 113, 0.35), rgba(255, 159, 94, 0.24), rgba(255, 195, 113, 0.35))',
    accent: 'rgba(255, 195, 113, 0.55)',
    glow: 'rgba(255, 177, 105, 0.45)',
  },
  voting: {
    icon: '🗳️',
    label: 'Voting',
    gradient: 'linear-gradient(120deg, rgba(129, 178, 255, 0.35), rgba(103, 147, 255, 0.26), rgba(129, 178, 255, 0.35))',
    accent: 'rgba(129, 178, 255, 0.5)',
    glow: 'rgba(129, 178, 255, 0.45)',
  },
  enactment: {
    icon: '⚡',
    label: 'Enactment',
    gradient: 'linear-gradient(120deg, rgba(170, 130, 255, 0.32), rgba(131, 96, 255, 0.26), rgba(170, 130, 255, 0.32))',
    accent: 'rgba(170, 130, 255, 0.55)',
    glow: 'rgba(170, 130, 255, 0.45)',
  },
  finished: {
    icon: '🏁',
    label: 'Finished',
    gradient: 'linear-gradient(120deg, rgba(129, 240, 170, 0.32), rgba(109, 215, 154, 0.24), rgba(129, 240, 170, 0.32))',
    accent: 'rgba(129, 240, 170, 0.5)',
    glow: 'rgba(129, 240, 170, 0.35)',
  },
};

const PhaseTile = ({ phase }: { phase: GamePhase }) => {
  const theme = phaseThemes[phase];

  return (
    <button
      type="button"
      className="phase-tile"
      style={{
        backgroundImage: theme.gradient,
        boxShadow: `0 16px 40px ${theme.glow}`,
      }}
      aria-label={`Current phase: ${theme.label}`}
    >
      <span className="phase-tile__icon" aria-hidden>
        {theme.icon}
      </span>
      <span className="phase-tile__label" style={{ color: theme.accent }}>
        {theme.label}
      </span>
    </button>
  );
};

const teamCopy: Record<string, string> = {
  syndicate: 'Syndicate',
  agency: 'Agency',
};

const roleLabels: Record<string, string> = {
  mastermind: 'Mastermind',
  syndicate_agent: 'Syndicate Agent',
  agency: 'Agency',
};

const powerCopy: Record<SyndicatePower, { title: string; description: string }> = {
  investigate: {
    title: 'Investigate',
    description: 'Peek at a player and log whether they align with the Agency or Syndicate.',
  },
  surveillance: {
    title: 'Surveillance',
    description: 'View the top three policy cards to prepare for the next draw.',
  },
  special_election: {
    title: 'Special Election',
    description: 'Choose the next Director instead of following the normal order.',
  },
  purge: {
    title: 'Purge',
    description: 'Eliminate a player from the game immediately.',
  },
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
  const [deputySelections, setDeputySelections] = useState<Record<number, string>>({});
  const [statusOpen, setStatusOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [drawnRounds, setDrawnRounds] = useState<Record<number, boolean>>({});
  const selectedDeputyId = room.deputyCandidateId ?? deputySelections[room.round] ?? '';
  const you = useMemo(() => players.find((p) => p.clientId === clientId), [clientId, players]);
  const roleDescription = you?.role
    ? roleCopy[you.role] ?? 'Role assigned.'
    : 'Waiting for role assignment…';
  const teamLabel = you?.team ? teamCopy[you.team] ?? you.team : 'Unassigned';
  const aliveLabel = you ? (you.alive ? 'Alive' : 'Eliminated') : 'Not seated';
  const aliveTone = you ? (you.alive ? 'success' : 'danger') : 'neutral';
  const knownTeammates = you?.knownTeammateIds
    ? players.filter((player) => you.knownTeammateIds?.includes(player.id))
    : [];

  const alivePlayers = useMemo(() => players.filter((player) => player.alive), [players]);
  const directorCandidate = useMemo(
    () => players.find((player) => player.id === room.directorCandidateId),
    [players, room.directorCandidateId],
  );
  const deputyCandidate = useMemo(
    () => players.find((player) => player.id === room.deputyCandidateId),
    [players, room.deputyCandidateId],
  );

  const voteTallies = room.voteTallies ?? {};
  const hasVoted = you ? Boolean(voteTallies[you.id]) : false;
  const majorityNeeded = Math.floor(alivePlayers.length / 2) + 1;
  const instability = room.instabilityCount ?? 0;
  const syndicateEnacted = room.syndicatePoliciesEnacted ?? 0;
  const agencyEnacted = room.agencyPoliciesEnacted ?? 0;
  const directorHand = room.directorHand ?? [];
  const deputyHand = room.deputyHand ?? [];
  const isDirector = you?.id === room.directorId;
  const isDeputy = you?.id === room.deputyId;
  const investigationResults = room.investigationResults ?? {};
  const surveillancePeek = room.surveillancePeek ?? [];
  const [investigationTarget, setInvestigationTarget] = useState('');
  const [specialElectionTarget, setSpecialElectionTarget] = useState('');
  const [purgeTarget, setPurgeTarget] = useState('');
  const unlockedPowers = useMemo(
    () => getUnlockedSyndicatePowers(syndicateEnacted),
    [syndicateEnacted],
  );
  const resolvedPowers = (room.syndicatePowersResolved ?? []) as SyndicatePower[];
  const pendingPowers = unlockedPowers.filter((power) => !resolvedPowers.includes(power));
  const canUsePowers = isDirector && room.phase === 'enactment' && !room.autoEnactment;
  const hasDrawnThisRound = drawnRounds[room.round] ?? false;

  const formatPolicyLabel = (card: string) =>
    card === 'syndicate' ? 'Syndicate Policy' : 'Agency Policy';

  const handleNominationSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedDeputyId) {
      onNominateDeputy(selectedDeputyId);
    }
  };

  const policyThresholds: { count: number; label: string }[] = [
    { count: 1, label: 'Investigate' },
    { count: 2, label: 'Surveillance' },
    { count: 3, label: 'Special Election' },
    { count: 4, label: 'Purge' },
  ];

  const renderPolicyTrack = () => {
    const agencyProgress = Math.min(agencyEnacted, 6) * (100 / 12);
    const syndicateProgress = Math.min(syndicateEnacted, 6) * (100 / 12);
    const markerStart = 50; // midpoint for Syndicate markers

    return (
      <div className="policy-track">
        <div className="policy-track__legend">
          <span className="pill success">Agency {agencyEnacted} / 6</span>
          <span className="pill danger">Syndicate {syndicateEnacted} / 6</span>
        </div>
        <div className="policy-track__bar" role="img" aria-label="Policy track progress">
          <div className="policy-track__segment policy-track__segment--agency" style={{ width: `${agencyProgress}%` }} />
          <div className="policy-track__divider" aria-hidden />
          <div
            className="policy-track__segment policy-track__segment--syndicate"
            style={{ width: `${syndicateProgress}%` }}
          />
          {policyThresholds.map((threshold) => (
            <div
              key={threshold.count}
              className={`policy-track__marker ${syndicateEnacted >= threshold.count ? 'is-active' : ''}`}
              style={{ left: `calc(${markerStart}% + ${(threshold.count / 6) * 50}%)` }}
            >
              <span className="policy-track__marker-label">{threshold.label}</span>
            </div>
          ))}
        </div>
        <div className="policy-track__labels">
          <span>Agency</span>
          <span>Syndicate</span>
        </div>
      </div>
    );
  };

  return (
    <div className="screen game-stage">
      <header className="stage-header">
        <div className="stage-header__actions">
          <button
            type="button"
            className={`icon-button ${statusOpen ? 'is-active' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={statusOpen}
            aria-label="Open table menu"
            onClick={() => setStatusOpen((open) => !open)}
          >
            ☰
          </button>
          <button
            type="button"
            className={`icon-button role-button ${roleModalOpen ? 'is-active' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={roleModalOpen}
            aria-label="Show your role and teammates"
            onClick={() => setRoleModalOpen(true)}
          >
            🎭
          </button>
          <button
            type="button"
            className={`icon-button ${playersOpen ? 'is-active' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={playersOpen}
            aria-label="Show players"
            onClick={() => setPlayersOpen(true)}
          >
            👥
          </button>
        </div>
      </header>

      <div className="stage-grid">
        <section className="stage-panel stage-panel--primary">
          <div className="tempo-phase-strip compact">
            <PhaseTile phase={room.phase} />
          </div>

          <div className="card">
            <div className="card-header">
              <h2>📊 Policy Track</h2>
            </div>
            {renderPolicyTrack()}
          </div>

          {room.phase === 'nomination' ? (
            <div className="card">
              <div className="card-header">
                <h2>🎯 Nominate a Deputy</h2>
                <span className="chip chip-soft">Director picks</span>
              </div>
              {directorCandidate ? (
                you?.id === directorCandidate.id ? (
                  <form className="stack" onSubmit={handleNominationSubmit}>
                    <label className="field">
                      <span>Select a Deputy</span>
                      <select
                        value={selectedDeputyId}
                        onChange={(event) =>
                          setDeputySelections((prev) => ({
                            ...prev,
                            [room.round]: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="" disabled>
                          Choose a teammate
                        </option>
                        {alivePlayers
                          .filter(
                            (player) =>
                              player.id !== directorCandidate.id &&
                              player.id !== room.previousDirectorId,
                          )
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.displayName}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button type="submit" className="primary" disabled={!selectedDeputyId || busyAction === 'nominate'}>
                      {busyAction === 'nominate' ? 'Submitting…' : 'Nominate Deputy'}
                    </button>
                  </form>
                ) : (
                  <p className="muted">
                    Waiting for {directorCandidate.displayName} to nominate a Deputy.
                  </p>
                )
              ) : (
                <p className="muted">No director is available to nominate a Deputy.</p>
              )}
            </div>
          ) : null}

          {room.phase === 'voting' ? (
            <div className="card">
              <div className="card-header">
                <h2>✅ Approve or Reject</h2>
                <span className="chip chip-soft">Majority needs {majorityNeeded}</span>
              </div>
              <p className="muted">
                Director {directorCandidate?.displayName ?? 'Unknown'} nominated Deputy{' '}
                {deputyCandidate?.displayName ?? 'Unknown'}.
              </p>
              <p className="muted">Votes remain hidden until every agent has submitted their choice.</p>
              {you?.alive ? (
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => onSubmitVote('approve')}
                    disabled={hasVoted || busyAction === 'vote'}
                  >
                    {hasVoted && voteTallies[you.id] === 'approve' ? 'Approved' : 'Approve'}
                  </button>
                  <button
                    className="danger"
                    onClick={() => onSubmitVote('reject')}
                    disabled={hasVoted || busyAction === 'vote'}
                  >
                    {hasVoted && voteTallies[you.id] === 'reject' ? 'Rejected' : 'Reject'}
                  </button>
                </div>
              ) : (
                <p className="muted">You cannot vote while eliminated.</p>
              )}
              {hasVoted ? <p className="muted">Vote recorded. Waiting for every agent to vote.</p> : null}
            </div>
          ) : null}

          {room.phase === 'enactment' ? (
            <div className="card">
              <div className="card-header">
                <h2>🚀 Policy Enactment</h2>
                <span className="chip chip-soft">Resolve and advance</span>
              </div>
              {room.autoEnactment ? (
                <div className="stack">
                  <p className="muted">Instability triggered an automatic policy enactment.</p>
                  <button
                    className="primary"
                    onClick={onAutoEnactPolicy}
                    disabled={busyAction === 'auto-enact'}
                  >
                    {busyAction === 'auto-enact' ? 'Auto-enacting…' : 'Auto-Enact Policy'}
                  </button>
                </div>
              ) : (
                <>
                  <p className="muted">
                    Director {directorCandidate?.displayName ?? 'Unknown'} and Deputy{' '}
                    {deputyCandidate?.displayName ?? 'Unknown'} are handling policy cards.
                  </p>
                  {isDirector ? (
                    <div className="card nested-card">
                      <div className="card-header">
                        <h3>Director Hand</h3>
                        <span className="pill neutral">Draw &amp; discard</span>
                      </div>
                      {directorHand.length === 3 ? (
                        <ul className="list">
                          {directorHand.map((card, index) => (
                            <li key={index} className="list-row">
                              <div>
                                <p className="list-title">{formatPolicyLabel(card)}</p>
                                <p className="muted">Discard one card to pass two onward.</p>
                              </div>
                              <button
                                className="secondary"
                                onClick={() => onDirectorDiscard(index)}
                                disabled={busyAction === `director-discard-${index}`}
                              >
                                {busyAction === `director-discard-${index}` ? 'Discarding…' : 'Discard'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="stack">
                          <p className="muted">Draw three policy cards to start enactment.</p>
                          {hasDrawnThisRound ? (
                            <p className="muted">Policies for this cycle are already in motion.</p>
                          ) : (
                            <button
                              className="secondary"
                              onClick={async () => {
                                setDrawnRounds((prev) => ({ ...prev, [room.round]: true }));
                                await onDrawPolicies();
                              }}
                              disabled={busyAction === 'draw'}
                            >
                              {busyAction === 'draw' ? 'Drawing…' : 'Draw Policies'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {isDeputy ? (
                    <div className="card nested-card">
                      <div className="card-header">
                        <h3>Deputy Hand</h3>
                        <span className="pill neutral">Discard &amp; enact</span>
                      </div>
                      {deputyHand.length === 2 ? (
                        <ul className="list">
                          {deputyHand.map((card, index) => (
                            <li key={index} className="list-row">
                              <div>
                                <p className="list-title">{formatPolicyLabel(card)}</p>
                                <p className="muted">Choose one card to enact; the other is discarded.</p>
                              </div>
                              <button
                                className="primary"
                                onClick={() => onDeputyEnact(index)}
                                disabled={busyAction === `deputy-enact-${index}`}
                              >
                                {busyAction === `deputy-enact-${index}` ? 'Enacting…' : 'Enact'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">Waiting for the Director to pass two policies.</p>
                      )}
                    </div>
                  ) : null}

                  {!isDirector && !isDeputy ? (
                    <div className="stack">
                      <p className="muted">Waiting for the Director to resolve their draw.</p>
                      <p className="muted">Waiting for the Deputy to enact a policy.</p>
                    </div>
                  ) : null}
                </>
              )}
              <p className="muted">The table will advance automatically after policy resolution.</p>
            </div>
          ) : null}

          {room.status === 'finished' ? (
            <div className="card">
              <div className="card-header">
                <h2>🏁 Game Over</h2>
              </div>
              <p className="muted">Roles revealed for everyone.</p>
            </div>
          ) : null}
        </section>

        <section className="stage-panel stage-panel--support">
          <div className="card emphasis">
            <div className="card-header">
              <h2>🛰️ Director Powers</h2>
              <span className="chip chip-soft">Unlocked via Syndicate thresholds</span>
            </div>
            {pendingPowers.length ? (
              <ul className="list">
                {pendingPowers.map((power) => (
                  <li key={power} className="list-row">
                    <div>
                      <p className="list-title">{powerCopy[power]?.title ?? power}</p>
                      <p className="muted">{powerCopy[power]?.description ?? 'Special power available.'}</p>
                    </div>
                    {power === 'investigate' ? (
                      canUsePowers ? (
                        <div className="list-actions">
                          <select
                            value={investigationTarget}
                            onChange={(event) => setInvestigationTarget(event.target.value)}
                            required
                          >
                            <option value="" disabled>
                              Select target
                            </option>
                            {alivePlayers
                              .filter((player) => player.id !== you?.id)
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.displayName}
                                </option>
                              ))}
                          </select>
                          <button
                            className="primary"
                            onClick={() => investigationTarget && onInvestigatePlayer(investigationTarget)}
                            disabled={!investigationTarget || busyAction === `investigate-${investigationTarget}`}
                          >
                            {busyAction === `investigate-${investigationTarget}` ? 'Investigating…' : 'Investigate'}
                          </button>
                        </div>
                      ) : (
                        <span className="pill neutral">Director will resolve</span>
                      )
                    ) : null}
                    {power === 'surveillance' ? (
                      canUsePowers ? (
                        <button
                          className="secondary"
                          onClick={onUseSurveillance}
                          disabled={busyAction === 'surveillance'}
                        >
                          {busyAction === 'surveillance' ? 'Revealing…' : 'Reveal Top Policies'}
                        </button>
                      ) : (
                        <span className="pill neutral">Director will resolve</span>
                      )
                    ) : null}
                    {power === 'special_election' ? (
                      canUsePowers ? (
                        <div className="list-actions">
                          <select
                            value={specialElectionTarget}
                            onChange={(event) => setSpecialElectionTarget(event.target.value)}
                            required
                          >
                            <option value="" disabled>
                              Choose next Director
                            </option>
                            {alivePlayers
                              .filter((player) => player.id !== you?.id)
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.displayName}
                                </option>
                              ))}
                          </select>
                          <button
                            className="secondary"
                            onClick={() => specialElectionTarget && onSpecialElection(specialElectionTarget)}
                            disabled={
                              !specialElectionTarget ||
                              busyAction === `special-election-${specialElectionTarget}`
                            }
                          >
                            {busyAction === `special-election-${specialElectionTarget}`
                              ? 'Assigning…'
                              : 'Assign Director'}
                          </button>
                        </div>
                      ) : (
                        <span className="pill neutral">Director will resolve</span>
                      )
                    ) : null}
                    {power === 'purge' ? (
                      canUsePowers ? (
                        <div className="list-actions">
                          <select
                            value={purgeTarget}
                            onChange={(event) => setPurgeTarget(event.target.value)}
                            required
                          >
                            <option value="" disabled>
                              Choose a player to eliminate
                            </option>
                            {alivePlayers
                              .filter((player) => player.id !== you?.id)
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.displayName}
                                </option>
                              ))}
                          </select>
                          <button
                            className="danger"
                            onClick={() => purgeTarget && onPurgePlayer(purgeTarget)}
                            disabled={busyAction === `purge-${purgeTarget}` || !purgeTarget}
                          >
                            {busyAction === `purge-${purgeTarget}` ? 'Eliminating…' : 'Purge Player'}
                          </button>
                        </div>
                      ) : (
                        <span className="pill neutral">Director will resolve</span>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No unresolved Director powers at the moment.</p>
            )}

            {Object.keys(investigationResults).length ? (
              <div className="stack">
                <p className="muted">Recorded investigations (visible to Directors).</p>
                {isDirector ? (
                  <ul className="list">
                    {Object.entries(investigationResults).map(([playerId, result]) => {
                      const target = players.find((player) => player.id === playerId);
                      return (
                        <li key={playerId} className="list-row">
                          <div>
                            <p className="list-title">{target?.displayName ?? 'Unknown player'}</p>
                            <p className="muted">{result === 'agency' ? 'Agency' : 'Syndicate-aligned'}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted">Investigations have been logged.</p>
                )}
              </div>
            ) : null}

            {surveillancePeek.length && isDirector ? (
              <div className="stack">
                <p className="muted">Top of deck (from Surveillance):</p>
                <ul className="list">
                  {surveillancePeek.map((card, index) => (
                    <li key={index} className="list-row">
                      <p className="list-title">{formatPolicyLabel(card)}</p>
                      <span className="pill neutral">Position {index + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {room.specialElectionDirectorId ? (
              <p className="muted">
                Special election in effect. Next Director:
                {' '}
                {players.find((player) => player.id === room.specialElectionDirectorId)?.displayName ?? 'Chosen player'}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {statusOpen ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Table menu">
          <div className="overlay-panel">
            <div className="overlay-header">
              <div>
                <p className="eyebrow">Room overview</p>
                <h2>Quick stats</h2>
              </div>
              <button
                type="button"
                className="icon-button ghost"
                aria-label="Close menu"
                onClick={() => setStatusOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="overlay-content">
              <div className="overlay-section">
                <p className="overlay-section__title">Table snapshot</p>
                <p className="overlay-lede">Quick access to the essentials without cluttering the stage.</p>
                <div className="overlay-grid overlay-grid--wide">
                  <div className="overlay-tile">
                    <p className="muted">Players</p>
                    <p className="overlay-value">{players.length}</p>
                  </div>
                  <div className="overlay-tile">
                    <p className="muted">Room code</p>
                    <p className="overlay-value code">{room.code}</p>
                  </div>
                  <div className="overlay-tile">
                    <p className="muted">Instability</p>
                    <p className="overlay-value">{instability} / 3</p>
                  </div>
                  <div className="overlay-tile">
                    <p className="muted">Majority needed</p>
                    <p className="overlay-value">{majorityNeeded}</p>
                  </div>
                </div>
              </div>

              <div className="overlay-section overlay-section--row">
                <PhaseTile phase={room.phase} />
                <div className="overlay-section__body">
                  <p className="overlay-section__title">Current tempo</p>
                  <p className="muted">Round {room.round} · {alivePlayers.length} active agents</p>
                  <div className="chip-row">
                    <span className={`pill ${room.autoEnactment ? 'danger' : 'neutral'}`}>
                      {room.autoEnactment ? 'Auto-enact in effect' : 'Manual enactment'}
                    </span>
                    <span className="pill neutral">{phaseThemes[room.phase].label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {roleModalOpen ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Your role details">
          <div className="overlay-panel">
            <div className="overlay-header">
              <div>
                <p className="eyebrow">Role briefing</p>
                <h2>🎭 Your Role</h2>
              </div>
              <button
                type="button"
                className="icon-button ghost"
                aria-label="Close role details"
                onClick={() => setRoleModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="overlay-content">
              <div className="overlay-section">
                <div className="chip-row role-popover__chips">
                  <span className="pill neutral">{teamLabel}</span>
                  <span className={`pill ${aliveTone}`}>{aliveLabel}</span>
                </div>
                <p className="role-callout">{roleDescription}</p>
                <p className="muted">Known team: {teamLabel}</p>
              </div>

              {you ? (
                <div className="overlay-section">
                  <p className="overlay-section__title">Known teammates</p>
                  {knownTeammates.length ? (
                    <ul className="overlay-list">
                      {knownTeammates.map((player) => (
                        <li key={player.id} className="overlay-list__item">
                          <div>
                            <p className="list-title">{player.displayName}</p>
                            <p className="overlay-meta">{roleLabels[player.role ?? ''] ?? 'Unknown'}</p>
                          </div>
                          <span className={player.alive ? 'pill success' : 'pill danger'}>
                            {player.alive ? 'Alive' : 'Eliminated'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No teammates revealed to you yet.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {playersOpen ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Players list">
          <div className="overlay-panel">
            <div className="overlay-header">
              <div>
                <p className="eyebrow">Roster</p>
                <h2>👥 Players</h2>
              </div>
              <button
                type="button"
                className="icon-button ghost"
                aria-label="Close players"
                onClick={() => setPlayersOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="overlay-content">
              <p className="overlay-lede">
                See who is seated, their allegiance when revealed, and who is still active.
              </p>
              <ul className="overlay-list overlay-list--players">
                {players.map((player) => (
                  <li key={player.id} className="overlay-list__item">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="overlay-meta">
                        {player.clientId === clientId ? 'You' : player.clientId === room.ownerClientId ? 'Owner' : 'Player'}
                      </p>
                    </div>
                    <div className="overlay-badges">
                      {room.status === 'finished' ? (
                        <>
                          <span className="pill neutral">
                            {player.team ? teamCopy[player.team] ?? player.team : 'Unknown Team'}
                          </span>
                          <span className="pill neutral">
                            {player.role ? roleLabels[player.role] ?? player.role : 'Unknown'}
                          </span>
                        </>
                      ) : null}
                      <span className={player.alive ? 'pill success' : 'pill danger'}>
                        {player.alive ? 'Alive' : 'Eliminated'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GameScreen;
