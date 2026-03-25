import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Building2, Trophy, Swords, User, LogOut, Menu, X, Zap, ClipboardList, Apple, RefreshCw } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { logout, refreshBalance, fetchProfile } from '../store/slices/authSlice';
import { toggleSidebar } from '../store/slices/uiSlice';
import { useState, useEffect } from 'react';
import { requestNotificationPermission, scheduleWorkoutReminder } from '../utils/notifications';
import SimpleInstallButton from './ui/SimpleInstallButton';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/workout-plan', icon: ClipboardList, label: 'Workout Plan' },
  { to: '/nutrition', icon: Apple, label: 'Nutrition' },
  { to: '/city', icon: Building2, label: 'My City' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/battles', icon: Swords, label: 'Battles' },
  { to: '/profile', icon: User, label: 'Profile' },
];

// Show these in the mobile bottom nav (max 5 for space)
const mobileNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/city', icon: Building2, label: 'City' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s: RootState) => s.auth);
  const { sidebarOpen } = useSelector((s: RootState) => s.ui);
  const [refreshing, setRefreshing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Fetch fresh profile data on mount to ensure points balance is current
  useEffect(() => {
    if (user) {
      dispatch(fetchProfile());
    }
  }, [dispatch, user?.id]);

  // Request notification permission and schedule reminders
  useEffect(() => {
    if (user) {
      requestNotificationPermission().then(granted => {
        if (granted) {
          // Schedule a workout reminder every 4 hours
          scheduleWorkoutReminder(4 * 60 * 60 * 1000);
        }
      });
    }
  }, [user?.id]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth');
  };

  const handleRefreshBalance = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await dispatch(refreshBalance()).unwrap();
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex h-screen page-bg overflow-hidden">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
        aria-label="Skip to main content"
      >
        Skip to content
      </a>

      {/* PWA Install Button */}
      <SimpleInstallButton />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            role="presentation"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop: always visible, mobile: slide in */}
      <motion.aside
        className={`fixed lg:relative z-40 h-full flex flex-col w-64 glass border-r border-white/5 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ borderRadius: 0 }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="p-4 sm:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/30 to-space-500/30 border border-neon-cyan/30 flex items-center justify-center" aria-hidden="true">
              <Zap className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-sm tracking-widest uppercase">ZenithCity</h1>
              <p className="text-xs text-space-500 font-mono">Build Your Empire</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 mx-3 my-3 glass-sm" role="status" aria-label="User info">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-purple/30 to-space-600/30 border border-neon-purple/20 flex items-center justify-center text-sm font-display font-bold text-neon-purple" aria-hidden="true">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
              <p className="text-xs text-neon-yellow font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" aria-hidden="true" />
                <span>{user?.points_balance?.toLocaleString() || '0'} points</span>
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto touch-scroll" aria-label="Sidebar navigation">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                // Close sidebar on mobile when navigating
                if (window.innerWidth < 1024 && sidebarOpen) {
                  dispatch(toggleSidebar());
                }
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan'
                    : 'text-space-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-neon-cyan' : 'text-current'}`} aria-hidden="true" />
                  <span className="font-body text-sm font-medium">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-cyan"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-space-400 hover:text-neon-pink hover:bg-neon-pink/5 border border-transparent hover:border-neon-pink/20 transition-all duration-200"
            aria-label="Sign out of your account"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className="font-body text-sm">Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden" id="main-content" role="main">
        {/* Top bar */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 glass-sm flex-shrink-0" style={{ borderRadius: 0 }} role="banner">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 text-space-400 hover:text-white rounded-lg"
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass-sm rounded-lg" aria-label={`${user?.points_balance?.toLocaleString() || '0'} points balance`}>
              <Zap className="w-4 h-4 text-neon-yellow" aria-hidden="true" />
              <span className="font-mono text-sm font-medium text-neon-yellow">
                {user?.points_balance?.toLocaleString() || '0'}
              </span>
            </div>
            <button
              onClick={handleRefreshBalance}
              disabled={refreshing}
              className="p-2 text-space-400 hover:text-white rounded-lg transition-colors"
              aria-label="Refresh points balance"
            >
              <RefreshCw className={`w-4 h-4 text-neon-cyan ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0 touch-scroll">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" role="navigation" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          {mobileNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || 
              (to === '/dashboard' && location.pathname === '/');
            return (
              <NavLink
                key={to}
                to={to}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] font-mono font-medium leading-none">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="w-1 h-1 rounded-full bg-neon-cyan"
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            );
          })}
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="mobile-nav-item"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-mono font-medium leading-none">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Modal */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full bg-space-900 border-t border-space-700 rounded-t-3xl p-6 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-space-700 rounded-full mx-auto mb-6" />
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-all"
                >
                  <User className="w-5 h-5 text-neon-cyan" />
                  <span className="font-body text-sm font-medium">Profile</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neon-pink hover:bg-neon-pink/5 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-body text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
