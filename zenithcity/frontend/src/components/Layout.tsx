import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Building2, Trophy, Swords, User, LogOut, Menu, X, Zap } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import { toggleSidebar } from '../store/slices/uiSlice';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/city', icon: Building2, label: 'My City' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/battles', icon: Swords, label: 'Battles' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const { sidebarOpen } = useSelector((s: RootState) => s.ui);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth');
  };

  return (
    <div className="flex h-screen page-bg overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:relative z-40 h-full flex flex-col w-64 glass border-r border-white/5 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ borderRadius: 0 }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/30 to-space-500/30 border border-neon-cyan/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-sm tracking-widest uppercase">ZenithCity</h1>
              <p className="text-xs text-space-500 font-mono">Build Your Empire</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 mx-3 my-3 glass-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-purple/30 to-space-600/30 border border-neon-purple/20 flex items-center justify-center text-sm font-display font-bold text-neon-purple">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
              <p className="text-xs text-neon-yellow font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {user?.points_balance?.toLocaleString() || '0'} pts
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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
                  <Icon className={`w-4 h-4 ${isActive ? 'text-neon-cyan' : 'text-current'}`} />
                  <span className="font-body text-sm font-medium">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-cyan"
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
          >
            <LogOut className="w-4 h-4" />
            <span className="font-body text-sm">Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 glass-sm flex-shrink-0" style={{ borderRadius: 0 }}>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 text-space-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass-sm rounded-lg">
              <Zap className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-sm font-medium text-neon-yellow">
                {user?.points_balance?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
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
    </div>
  );
}
