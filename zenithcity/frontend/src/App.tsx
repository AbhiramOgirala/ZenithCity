import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState, AppDispatch } from './store';
import { fetchProfile } from './store/slices/authSlice';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutPage from './pages/WorkoutPage';
import WorkoutPlanPage from './pages/WorkoutPlanPage';
import NutritionPage from './pages/NutritionPage';
import CityPage from './pages/CityPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BattlesPage from './pages/BattlesPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
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
  const dispatch = useDispatch<AppDispatch>();
  const { token, user } = useSelector((s: RootState) => s.auth);
  const storedToken = localStorage.getItem('zenith_token');
  const isAuthenticated = !!(token || storedToken);
  const needsOnboarding = isAuthenticated && user && user.onboarding_completed === false;

  // Fetch fresh profile (including points_balance) on every app load
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchProfile());
  }, [isAuthenticated, dispatch]);

  return (
    <Routes>
      <Route path="/auth" element={
        isAuthenticated 
          ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <Navigate to="/dashboard" replace />) 
          : <AuthPage />
      } />
      <Route path="/onboarding" element={
        isAuthenticated ? <OnboardingPage /> : <Navigate to="/auth" replace />
      } />
      <Route path="/*" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/workout-plan" element={<WorkoutPlanPage />} />
              <Route path="/nutrition" element={<NutritionPage />} />
              <Route path="/city" element={<CityPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/battles" element={<BattlesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Layout>
        </PrivateRoute>
        )
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
