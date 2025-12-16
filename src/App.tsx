import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import HomeScreen from './screens/HomeScreen';
import RoomScreen from './screens/RoomScreen';
import { useClientId } from './hooks/useClientId';
import { ClientIdProvider } from './contexts/ClientContext';
import LocalPreviewScreen from './screens/LocalPreviewScreen';
import MastermindMockScreen from './screens/MastermindMockScreen';
import MastermindMockLobbyScreen from './screens/MastermindMockLobbyScreen';

const App = () => {
  const clientId = useClientId();
  const enableLocalPreview = import.meta.env.DEV;

  if (!clientId) {
    return (
      <div className="screen">
        <p className="muted">Setting up your device…</p>
      </div>
    );
  }

  return (
    <ClientIdProvider clientId={clientId}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
            <Route path="/rooms/:roomId" element={<RoomScreen />} />
        {enableLocalPreview ? (
          <>
            <Route path="/local-preview" element={<LocalPreviewScreen />} />
            <Route path="/ui-mock" element={<MastermindMockScreen />} />
            <Route path="/ui-mock-lobby" element={<MastermindMockLobbyScreen />} />
          </>
        ) : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClientIdProvider>
  );
};

export default App;
