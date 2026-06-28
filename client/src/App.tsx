import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { getToken, isTokenExpired, removeToken } from './services/api';
import { SocketProvider } from './context/SocketContext';

// Route protection wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    if (token) {
      removeToken();
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <SocketProvider>
                <Dashboard />
              </SocketProvider>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
