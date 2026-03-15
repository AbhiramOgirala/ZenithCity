import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutPage from './pages/WorkoutPage';
import CityPage from './pages/CityPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BattlesPage from './pages/BattlesPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import ToastContainer from './components/ui/ToastContainer';
import { useSocket } from './hooks/useSocket';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useSelector((s: RootState) => s.auth);
  
  // Check both Redux state and localStorage
  const storedToken = localStorage.getItem('zenith_token');
  const hasToken = token || storedToken;
  
  return hasToken ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppContent() {
  useSocket();
  const { token } = useSelector((s: RootState) => s.auth);
  const storedToken = localStorage.getItem('zenith_token');
  const isAuthenticated = !!(token || storedToken);

  return (
    <Routes>
      <Route path="/auth" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
      } />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/city" element={<CityPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/battles" element={<BattlesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
      <ToastContainer />
    </>
  );
}
