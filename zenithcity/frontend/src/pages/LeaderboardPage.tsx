import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Zap, ChevronUp, ChevronDown, Minus, Shield } from 'lucide-react';
import { fetchLeaderboard, setType } from '../store/slices/leaderboardSlice';
import { RootState, AppDispatch } from '../store';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TABS = ['all-time', 'weekly', 'monthly'] as const;

const podiumColors = [
  { bg: 'from-neon-yellow/20', border: 'border-neon-yellow/40', text: 'text-neon-yellow', icon: Crown },
  { bg: 'from-slate-400/10', border: 'border-slate-400/30', text: 'text-slate-300', icon: Medal },
  { bg: 'from-neon-orange/10', border: 'border-neon-orange/30', text: 'text-neon-orange', icon: Medal },
];

export default function LeaderboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, viewer_rank, viewer_points, current_type, loading } = useSelector((s: RootState) => s.leaderboard);
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => { dispatch(fetchLeaderboard(current_type)); }, [dispatch, current_type]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Leaderboard</h1>
          <p className="text-space-400 text-sm mt-0.5">Your rank: <span className="text-neon-cyan font-mono font-bold">#{viewer_rank}</span></p>
        </div>
        <Trophy className="w-8 h-8 text-neon-yellow" />
      </div>

      {/* Type tabs */}
      <div className="glass-sm p-1 rounded-xl flex w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => dispatch(setType(tab))}
            className={`px-4 py-2 text-xs font-display font-semibold tracking-widest uppercase rounded-lg transition-all ${
              current_type === tab
                ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                : 'text-space-400 hover:text-white'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Your rank card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border border-neon-cyan/20 p-4 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-neon-cyan" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-space-400 font-mono">Your Position</p>
          <p className="text-2xl font-display font-black text-neon-cyan">#{viewer_rank}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-space-400 font-mono">Points</p>
          <p className="text-lg font-display font-bold text-neon-yellow flex items-center gap-1">
            <Zap className="w-4 h-4" />{viewer_points.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[top3[1], top3[0], top3[2]].map((entry, idx) => {
                const realIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                const style = podiumColors[realIdx];
                const Icon = style.icon;
                const isMe = entry.user_id === user?.id;
                const heights = ['h-28', 'h-36', 'h-24'];

                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: realIdx * 0.1 }}
                    className={`glass bg-gradient-to-b ${style.bg} border ${style.border} ${heights[idx]} flex flex-col items-center justify-end p-4 relative ${isMe ? 'ring-1 ring-neon-cyan/50' : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${style.text} mb-2`} />
                    <p className="text-xs font-semibold text-white truncate w-full text-center">{entry.username}</p>
                    <p className={`font-display font-black text-lg ${style.text}`}>#{entry.rank}</p>
                    <p className="text-xs font-mono text-space-400">{entry.total_points.toLocaleString()}</p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <div className="glass">
            <div className="grid grid-cols-[40px_1fr_auto] gap-2 px-4 py-2 border-b border-white/5">
              <p className="text-xs font-mono text-space-500 uppercase">#</p>
              <p className="text-xs font-mono text-space-500 uppercase">Player</p>
              <p className="text-xs font-mono text-space-500 uppercase">Points</p>
            </div>
            <div className="divide-y divide-white/5">
              {entries.map((entry, idx) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`grid grid-cols-[40px_1fr_auto] gap-2 px-4 py-3 items-center transition-all ${
                      isMe ? 'bg-neon-cyan/5 border-l-2 border-neon-cyan' : 'hover:bg-white/3'
                    }`}
                  >
                    <span className={`text-sm font-display font-bold ${
                      entry.rank === 1 ? 'text-neon-yellow' :
                      entry.rank === 2 ? 'text-slate-300' :
                      entry.rank === 3 ? 'text-neon-orange' :
                      isMe ? 'text-neon-cyan' : 'text-space-400'
                    }`}>
                      {entry.rank}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isMe ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-space-700 text-space-400'
                      }`}>
                        {entry.username[0]?.toUpperCase()}
                      </div>
                      <span className={`text-sm truncate ${isMe ? 'text-neon-cyan font-semibold' : 'text-white'}`}>
                        {entry.username}
                        {isMe && <span className="ml-1 text-xs text-space-500">(you)</span>}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-neon-yellow font-bold">
                      {entry.total_points.toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
