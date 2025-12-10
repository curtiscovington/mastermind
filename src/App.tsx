import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import HomeScreen from './screens/HomeScreen';
import RoomScreen from './screens/RoomScreen';
import { useClientId } from './hooks/useClientId';
import { ClientIdProvider } from './contexts/ClientContext';

const App = () => {
  const clientId = useClientId();

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClientIdProvider>
  );
};

export default App;
