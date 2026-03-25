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
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
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
      <Route path="/" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <Navigate to="/dashboard" replace />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/dashboard" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <DashboardPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/workout" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <WorkoutPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/workout-plan" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <WorkoutPlanPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/nutrition" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <NutritionPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/city" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <CityPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/leaderboard" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <LeaderboardPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/battles" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <BattlesPage />
          </Layout>
        </PrivateRoute>
        )
      } />
      <Route path="/profile" element={
        isAuthenticated && needsOnboarding ? <Navigate to="/onboarding" replace /> : (
        <PrivateRoute>
          <Layout>
            <ProfilePage />
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
      <PWAInstallPrompt />
    </>
  );
}
