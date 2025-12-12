import { useMemo, useState } from 'react';
import GameScreen from './GameScreen';
import LobbyScreen from './LobbyScreen';
import ResultsScreen from './ResultsScreen';
import { ClientIdProvider, useClientIdContext } from '../contexts/ClientContext';
import { previewClientIds, previewScenarios, type PreviewScenarioKey } from '../mocks/previewData';
import type { Player } from '../types';

const busyActionOptions: { value: string | null; label: string }[] = [
  { value: null, label: 'No busy state' },
  { value: 'start', label: 'Starting game' },
  { value: 'nominate', label: 'Nominating deputy' },
  { value: 'vote', label: 'Submitting vote' },
  { value: 'draw', label: 'Drawing policies' },
  { value: 'director-discard-1', label: 'Director discarding' },
  { value: 'deputy-enact-0', label: 'Deputy enacting' },
  { value: 'investigate-player-1', label: 'Investigating' },
  { value: 'surveillance', label: 'Using surveillance' },
  { value: 'special-election-player-2', label: 'Calling special election' },
  { value: 'purge-player-5', label: 'Purging a player' },
  { value: 'auto-enact', label: 'Auto enact (owner only)' },
  { value: 'round', label: 'Advancing round' },
  { value: 'end', label: 'Ending game' },
];

const LocalPreviewScreen = () => {
  const persistedClientId = useClientIdContext();
  const [scenarioKey, setScenarioKey] = useState<PreviewScenarioKey>('lobby');
  const [clientId, setClientId] = useState<string>(previewClientIds[0] ?? persistedClientId);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeScenario = previewScenarios[scenarioKey];
  const effectiveClientId = clientId || persistedClientId;
  const selectableClientIds = useMemo(
    () => Array.from(new Set([persistedClientId, ...previewClientIds])),
    [persistedClientId],
  );

  const simulate = (action: string | null) =>
    new Promise<void>((resolve) => {
      setBusyAction(action);
      window.setTimeout(() => {
        setBusyAction(null);
        resolve();
      }, 500);
    });

  const previewContent = useMemo(() => {
    if (!activeScenario) return null;

    const { room, players } = activeScenario;

    if (room.status === 'lobby' || room.phase === 'lobby') {
      return (
        <LobbyScreen
          room={room}
          players={players}
          clientId={effectiveClientId}
          onStartGame={() => simulate('start')}
          starting={busyAction === 'start'}
        />
      );
    }

    if (room.status === 'finished' || room.phase === 'finished') {
      return <ResultsScreen room={room} players={players} />;
    }

    return (
      <GameScreen
        room={room}
        players={players}
        clientId={effectiveClientId}
        onNextRound={() => simulate('round')}
        onToggleAlive={(player: Player) => simulate(player.id)}
        onEndGame={() => simulate('end')}
        onNominateDeputy={() => simulate('nominate')}
        onSubmitVote={() => simulate('vote')}
        onDrawPolicies={() => simulate('draw')}
        onDirectorDiscard={(cardIndex: number) => simulate(`director-discard-${cardIndex}`)}
        onDeputyEnact={(cardIndex: number) => simulate(`deputy-enact-${cardIndex}`)}
        onAutoEnactPolicy={() => simulate('auto-enact')}
        onInvestigatePlayer={(playerId: string) => simulate(`investigate-${playerId}`)}
        onUseSurveillance={() => simulate('surveillance')}
        onSpecialElection={(directorId: string) => simulate(`special-election-${directorId}`)}
        onPurgePlayer={(playerId: string) => simulate(`purge-${playerId}`)}
        busyAction={busyAction}
      />
    );
  }, [activeScenario, busyAction, effectiveClientId]);

  return (
    <div className="screen">
      <header className="section-header">
        <div>
          <p className="eyebrow">Local only</p>
          <h1>Preview UI States</h1>
          <p className="muted">
            Swap between scenarios with dummy data to see how the interface looks without connecting to
            Firebase.
          </p>
        </div>
        <div className="badge">Dev Preview</div>
      </header>

      <div className="card">
        <div className="card-header">
          <h2>Preview Controls</h2>
          <span className="pill">Offline sandbox</span>
        </div>

        <div className="card-grid">
          <label className="field">
            <span>Scenario</span>
            <select
              value={scenarioKey}
              onChange={(event) => {
                setScenarioKey(event.target.value as PreviewScenarioKey);
                setBusyAction(null);
              }}
            >
              {Object.entries(previewScenarios).map(([key, scenario]) => (
                <option key={key} value={key}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>View as client</span>
            <select value={effectiveClientId} onChange={(event) => setClientId(event.target.value)}>
              {selectableClientIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Force busy state</span>
            <select
              value={busyAction ?? ''}
              onChange={(event) => setBusyAction(event.target.value ? event.target.value : null)}
            >
              {busyActionOptions.map((option) => (
                <option key={option.label} value={option.value ?? ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted">
          Actions here only simulate loading states. No data is saved and Firebase is never contacted.
        </p>
      </div>

      <ClientIdProvider clientId={effectiveClientId}>{previewContent}</ClientIdProvider>
    </div>
  );
};

export default LocalPreviewScreen;
