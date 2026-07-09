import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import { getToken } from './api/client';

function ProtectedRoute({ children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={getToken() ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
