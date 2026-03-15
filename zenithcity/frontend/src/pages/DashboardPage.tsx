import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Dumbbell, Building2, Trophy, Swords, Zap, TrendingUp, Heart, Map, ArrowRight, Flame, Shield, AlertTriangle } from 'lucide-react';
import { fetchDashboard } from '../store/slices/dashboardSlice';
import { RootState, AppDispatch } from '../store';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-sm px-3 py-2 text-xs">
        <p className="text-space-400 font-mono">{label}</p>
        <p className="text-neon-cyan font-bold font-mono">{payload[0].value} pts</p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((s: RootState) => s.dashboard);
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => { dispatch(fetchDashboard()); }, [dispatch]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-space-400 font-mono text-sm">Loading your empire...</p>
        </div>
      </div>
    );
  }

  const city = data?.city_state;
  const completedBuildings = city?.buildings?.filter((b: any) => b.status === 'completed').length || 0;
  const damagedBuildings = city?.buildings?.filter((b: any) => b.status === 'damaged').length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Welcome back, <span className="text-gradient-cyan">{user?.username}</span>
          </h1>
          <p className="text-space-400 text-sm mt-1">
            {data ? `Rank #${data.leaderboard_rank} • ${data.points_balance?.toLocaleString()} pts` : 'Loading...'}
          </p>
        </div>
        <Link to="/workout" className="btn-primary hidden sm:flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          Start Workout
        </Link>
      </motion.div>

      {/* City decline warning */}
      {city?.decline_active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 border border-neon-pink/40 bg-neon-pink/5 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-neon-pink flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-neon-pink font-semibold text-sm">City Decline Active!</p>
            <p className="text-space-400 text-xs">Your city is declining. Work out to halt the damage!</p>
          </div>
          <Link to="/workout" className="ml-auto btn-danger text-xs px-3 py-1.5">
            Workout Now
          </Link>
        </motion.div>
      )}

      {/* Stats grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-space-400 uppercase tracking-widest">Workouts / 30d</span>
            <Dumbbell className="w-4 h-4 text-neon-orange" />
          </div>
          <div className="text-3xl font-display font-bold text-neon-orange">{data?.workouts_last_30_days || 0}</div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-space-400 uppercase tracking-widest">Points</span>
            <Zap className="w-4 h-4 text-neon-yellow" />
          </div>
          <div className="text-3xl font-display font-bold text-neon-yellow">{data?.points_balance?.toLocaleString() || 0}</div>
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-space-400 uppercase tracking-widest">Global Rank</span>
            <Trophy className="w-4 h-4 text-neon-cyan" />
          </div>
          <div className="text-3xl font-display font-bold text-neon-cyan">#{data?.leaderboard_rank || '—'}</div>
          {data?.points_to_next_rank > 0 && (
            <p className="text-xs text-space-500">{data.points_to_next_rank} pts to next rank</p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-space-400 uppercase tracking-widest">Buildings</span>
            <Building2 className="w-4 h-4 text-neon-purple" />
          </div>
          <div className="text-3xl font-display font-bold text-neon-purple">{completedBuildings}</div>
          {damagedBuildings > 0 && (
            <p className="text-xs text-neon-pink">{damagedBuildings} damaged</p>
          )}
        </motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Points chart */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 glass p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-semibold text-white text-sm uppercase tracking-widest">Points — 12 Weeks</h2>
              <p className="text-xs text-space-500 mt-0.5">Weekly workout earnings</p>
            </div>
            <TrendingUp className="w-5 h-5 text-neon-cyan" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data?.weekly_points || []}>
              <defs>
                <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: '#4A5899', fontSize: 10 }} />
              <YAxis tick={{ fill: '#4A5899', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="points" stroke="#00F5FF" fill="url(#pointsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* City status */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="glass p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-white text-sm uppercase tracking-widest">City Status</h2>
            <Link to="/city" className="text-neon-cyan text-xs hover:underline flex items-center gap-1">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-space-400 font-mono">City Health</span>
                <span className="text-white font-mono">{city?.health || 100}%</span>
              </div>
              <div className="h-2 bg-space-800 rounded-full overflow-hidden">
                <div
                  className="h-full health-bar rounded-full transition-all duration-700"
                  style={{ width: `${city?.health || 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-space-400 font-mono">Territory</span>
                <span className="text-white font-mono">{city?.territory_size || 100} sqm</span>
              </div>
              <div className="h-2 bg-space-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neon-purple rounded-full transition-all duration-700"
                  style={{ width: `${((city?.territory_size || 100) / 10000) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center glass-sm p-3 rounded-lg">
                <Building2 className="w-4 h-4 text-neon-cyan mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-white">{completedBuildings}</p>
                <p className="text-xs text-space-500">Built</p>
              </div>
              <div className="text-center glass-sm p-3 rounded-lg">
                <Shield className="w-4 h-4 text-neon-green mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-white">{city?.territory_size || 100}</p>
                <p className="text-xs text-space-500">Area</p>
              </div>
              <div className="text-center glass-sm p-3 rounded-lg">
                <Flame className={`w-4 h-4 mx-auto mb-1 ${city?.decline_active ? 'text-neon-pink' : 'text-neon-green'}`} />
                <p className={`text-xs font-bold mt-0.5 ${city?.decline_active ? 'text-neon-pink' : 'text-neon-green'}`}>
                  {city?.decline_active ? 'Declining' : 'Healthy'}
                </p>
                <p className="text-xs text-space-500">Status</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Upcoming battles */}
      {data?.upcoming_battles?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white text-sm uppercase tracking-widest">Upcoming Battles</h2>
            <Link to="/battles" className="text-neon-cyan text-xs hover:underline flex items-center gap-1">
              All battles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.upcoming_battles.slice(0, 3).map((battle: any) => (
              <div key={battle.id} className="glass-sm p-4 rounded-xl border border-neon-purple/20 hover:border-neon-purple/40 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-4 h-4 text-neon-purple" />
                  <span className="text-sm font-semibold text-white">{battle.name}</span>
                </div>
                <p className="text-xs text-space-400">
                  Starts {new Date(battle.starts_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { to: '/workout', icon: Dumbbell, label: 'Start Workout', color: 'neon-orange', desc: 'Earn points & build' },
          { to: '/city', icon: Building2, label: 'Manage City', color: 'neon-cyan', desc: 'Construct & upgrade' },
          { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'neon-yellow', desc: 'See your rank' },
          { to: '/battles', icon: Swords, label: 'Join Battle', color: 'neon-purple', desc: 'Win territory' },
        ].map(({ to, icon: Icon, label, color, desc }) => (
          <Link
            key={to}
            to={to}
            className="glass-sm p-4 rounded-xl hover:border-white/10 border border-transparent transition-all group flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg bg-${color}/10 border border-${color}/20 flex items-center justify-center flex-shrink-0 group-hover:bg-${color}/20 transition-all`}>
              <Icon className={`w-5 h-5 text-${color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-space-500">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-space-600 ml-auto group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
