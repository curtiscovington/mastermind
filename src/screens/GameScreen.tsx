import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Player, Room, SyndicatePower, VoteChoice } from '../types';
import { getUnlockedSyndicatePowers } from '../utils/game';

type Props = {
  room: Room;
  players: Player[];
  clientId: string;
  onNextRound: () => Promise<void>;
  onToggleAlive: (player: Player) => Promise<void>;
  onEndGame: () => Promise<void>;
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
  onNextRound,
  onToggleAlive,
  onEndGame,
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
  const selectedDeputyId = room.deputyCandidateId ?? deputySelections[room.round] ?? '';
  const you = useMemo(() => players.find((p) => p.clientId === clientId), [clientId, players]);
  const isOwner = room.ownerClientId === clientId;
  const roleDescription = you?.role
    ? roleCopy[you.role] ?? 'Role assigned.'
    : 'Waiting for role assignment…';
  const teamLabel = you?.team ? teamCopy[you.team] ?? you.team : 'Unassigned';
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
  const previousDirector = useMemo(
    () => players.find((player) => player.id === room.previousDirectorId),
    [players, room.previousDirectorId],
  );

  const voteTallies = room.voteTallies ?? {};
  const approveCount = Object.values(voteTallies).filter((vote) => vote === 'approve').length;
  const rejectCount = Object.values(voteTallies).filter((vote) => vote === 'reject').length;
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

  const formatPolicyLabel = (card: string) =>
    card === 'syndicate' ? 'Syndicate Policy' : 'Agency Policy';

  const handleNominationSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedDeputyId) {
      onNominateDeputy(selectedDeputyId);
    }
  };

  const renderPhaseBadge = () => (
    <div className="pill neutral">Phase: {room.phase}</div>
  );

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Room {room.code}</p>
          <h1>Round {room.round}</h1>
          <p className="muted">Status: {room.status}</p>
        </div>
        <div className="badge">{isOwner ? 'Owner' : 'Player'}</div>
      </header>

      <div className="card emphasis">
        <div className="card-header">
          <h2>Your Role</h2>
          {you?.alive ? <span className="pill success">Alive</span> : <span className="pill danger">Eliminated</span>}
        </div>
        <p className="role-callout">{roleDescription}</p>
        <p className="muted">Team: {teamLabel}</p>

        {you ? (
          <div className="stack">
            <p className="muted">Known teammates</p>
            {knownTeammates.length ? (
              <ul className="list">
                {knownTeammates.map((player) => (
                  <li key={player.id} className="list-row">
                    <div>
                      <p className="list-title">{player.displayName}</p>
                      <p className="muted">{roleLabels[player.role ?? ''] ?? 'Unknown'}</p>
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

      <div className="card">
        <div className="card-header">
          <h2>Election Tracker</h2>
          {renderPhaseBadge()}
        </div>
        <ul className="list">
          <li className="list-row">
            <div>
              <p className="list-title">Director Candidate</p>
              <p className="muted">{directorCandidate?.displayName ?? 'Awaiting assignment'}</p>
            </div>
            <span className="pill neutral">{directorCandidate ? 'Chosen' : 'Pending'}</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Deputy Candidate</p>
              <p className="muted">{deputyCandidate?.displayName ?? 'No nomination yet'}</p>
            </div>
            <span className="pill neutral">{deputyCandidate ? 'Nominated' : 'Open'}</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Previous Director</p>
              <p className="muted">{previousDirector?.displayName ?? 'None yet'}</p>
            </div>
            <span className="pill neutral">History</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Instability</p>
              <p className="muted">{instability} / 3 failed votes</p>
            </div>
            <span className={instability >= 2 ? 'pill danger' : 'pill neutral'}>
              {instability >= 2 ? 'Critical' : 'Stable'}
            </span>
          </li>
        </ul>
        {room.autoEnactment ? (
          <p className="muted">
            Instability has peaked. A policy is auto-enacted after three failed votes.
          </p>
        ) : null}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Policy Tracks</h2>
        </div>
        <ul className="list">
          <li className="list-row">
            <div>
              <p className="list-title">Syndicate Policies Enacted</p>
              <p className="muted">Progress toward Mastermind victory.</p>
            </div>
            <span className="pill danger">{syndicateEnacted} / 6</span>
          </li>
          <li className="list-row">
            <div>
              <p className="list-title">Agency Policies Enacted</p>
              <p className="muted">Progress toward Agency victory.</p>
            </div>
            <span className="pill success">{agencyEnacted} / 6</span>
          </li>
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Director Powers</h2>
          <span className="pill neutral">Unlocked via Syndicate thresholds</span>
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
            Special election in effect. Next Director: {
              players.find((player) => player.id === room.specialElectionDirectorId)?.displayName ??
              'Chosen player'
            }
          </p>
        ) : null}
      </div>

      {room.phase === 'nomination' ? (
        <div className="card">
          <div className="card-header">
            <h2>Nominate a Deputy</h2>
            <span className="pill neutral">Director picks</span>
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
                      .filter((player) => player.id !== directorCandidate.id)
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
            <h2>Approve or Reject</h2>
            <span className="pill neutral">Majority needs {majorityNeeded}</span>
          </div>
          <p className="muted">
            Director {directorCandidate?.displayName ?? 'Unknown'} nominated Deputy
            {' '}
            {deputyCandidate?.displayName ?? 'Unknown'}.
          </p>
          <p>Votes: {approveCount} approve / {rejectCount} reject</p>
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
          {hasVoted ? <p className="muted">Vote recorded. Waiting for others…</p> : null}
        </div>
      ) : null}

      {room.phase === 'enactment' ? (
        <div className="card">
          <div className="card-header">
            <h2>Policy Enactment</h2>
            <span className="pill neutral">Resolve and advance</span>
          </div>
          {room.autoEnactment ? (
            <>
              <p className="muted">
                Three failed votes triggered instability. A policy is auto-enacted and the tracker resets.
              </p>
              {isOwner ? (
                <button
                  className="primary"
                  onClick={onAutoEnactPolicy}
                  disabled={busyAction === 'auto-enact'}
                >
                  {busyAction === 'auto-enact' ? 'Enacting…' : 'Resolve Auto-Enactment'}
                </button>
              ) : (
                <p className="muted">Waiting for the owner to resolve the auto-enactment.</p>
              )}
            </>
          ) : (
            <>
              <p className="muted">
                Election passed. Director {directorCandidate?.displayName ?? 'Unknown'} and Deputy{' '}
                {deputyCandidate?.displayName ?? 'Unknown'} will draw and enact a policy.
              </p>
              <div className="stack policy-stack">
                <div className="card nested-card">
                  <div className="card-header">
                    <h3>Director Hand</h3>
                    <span className="pill neutral">Draw & discard</span>
                  </div>
                  {isDirector ? (
                    directorHand.length === 0 ? (
                      <button
                        className="secondary"
                        onClick={onDrawPolicies}
                        disabled={busyAction === 'draw'}
                      >
                        {busyAction === 'draw' ? 'Drawing…' : 'Draw 3 Policies'}
                      </button>
                    ) : (
                      <ul className="list">
                        {directorHand.map((card, index) => (
                          <li key={index} className="list-row">
                            <div>
                              <p className="list-title">{formatPolicyLabel(card)}</p>
                              <p className="muted">Discard one and pass two to the Deputy.</p>
                            </div>
                            <button
                              className="ghost"
                              onClick={() => onDirectorDiscard(index)}
                              disabled={busyAction === `director-discard-${index}`}
                            >
                              {busyAction === `director-discard-${index}` ? 'Discarding…' : 'Discard'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <p className="muted">Director is drawing and discarding policies.</p>
                  )}
                </div>

                <div className="card nested-card">
                  <div className="card-header">
                    <h3>Deputy Hand</h3>
                    <span className="pill neutral">Discard & enact</span>
                  </div>
                  {isDeputy ? (
                    deputyHand.length === 2 ? (
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
                    )
                  ) : (
                    <p className="muted">
                      {deputyHand.length
                        ? 'Deputy is selecting which policy to enact.'
                        : 'Waiting for the Deputy to receive policies.'}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          <p className="muted">Use Next Round after resolving the policy to continue.</p>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h2>Players</h2>
        </div>
        <ul className="list">
          {players.map((player) => (
            <li key={player.id} className="list-row">
              <div>
                <p className="list-title">{player.displayName}</p>
                <p className="muted">
                  {player.clientId === clientId ? 'You' : player.clientId === room.ownerClientId ? 'Owner' : 'Player'}
                </p>
              </div>
              <div className="list-actions">
                {room.status === 'finished' ? (
                  <>
                    <span className="pill neutral">
                      {player.team ? teamCopy[player.team] ?? player.team : 'Unknown Team'}
                    </span>
                    <span className="pill neutral">{player.role ? roleLabels[player.role] ?? player.role : 'Unknown'}</span>
                  </>
                ) : null}
                <span className={player.alive ? 'pill success' : 'pill danger'}>
                  {player.alive ? 'Alive' : 'Eliminated'}
                </span>
                {isOwner && room.status !== 'finished' ? (
                  <button
                    className="ghost"
                    onClick={() => onToggleAlive(player)}
                    disabled={busyAction === player.id}
                  >
                    {busyAction === player.id ? 'Updating…' : player.alive ? 'Mark Dead' : 'Revive'}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isOwner ? (
        <div className="card owner-controls">
          <div className="card-header">
            <h2>Owner Controls</h2>
          </div>
          <div className="button-row">
            <button
              className="secondary"
              onClick={onNextRound}
              disabled={busyAction === 'round' || room.phase !== 'enactment'}
            >
              {busyAction === 'round' ? 'Advancing…' : 'Next Round'}
            </button>
            <button className="danger" onClick={onEndGame} disabled={busyAction === 'end'}>
              {busyAction === 'end' ? 'Ending…' : 'End Game'}
            </button>
          </div>
        </div>
      ) : null}

      {room.status === 'finished' ? (
        <div className="card">
          <div className="card-header">
            <h2>Game Over</h2>
          </div>
          <p className="muted">Roles revealed for everyone.</p>
        </div>
      ) : null}
    </div>
  );
};

export default GameScreen;
