import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Swords, Clock, Users, Trophy, Zap, Shield, ChevronRight, CheckCircle } from 'lucide-react';
import { fetchBattles, joinBattle } from '../store/slices/battleSlice';
import { addToast } from '../store/slices/uiSlice';
import { RootState, AppDispatch } from '../store';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function Countdown({ endsAt }: { endsAt: string }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTime('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(d > 0 ? `${d}d ${h}h ${m}m` : `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span className="font-mono font-bold text-neon-orange">{time}</span>;
}

export default function BattlesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { battles, loading } = useSelector((s: RootState) => s.battle);

  useEffect(() => { dispatch(fetchBattles()); }, [dispatch]);

  const handleJoin = async (battleId: string) => {
    const result = await dispatch(joinBattle(battleId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(addToast({ type: 'success', message: 'Enrolled in battle! ⚔️' }));
    } else {
      dispatch(addToast({ type: 'error', message: 'Could not join battle' }));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Territory Battles</h1>
          <p className="text-space-400 text-sm mt-0.5">Compete for territory — top 10% win expansion rewards</p>
        </div>
        <Swords className="w-8 h-8 text-neon-purple" />
      </div>

      {/* Info card */}
      <div className="glass border border-neon-purple/20 p-5">
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: Swords, label: 'Weekly battles', desc: 'Compete every week', color: 'text-neon-purple' },
            { icon: Trophy, label: 'Top 10% wins', desc: 'Bonus territory rewards', color: 'text-neon-yellow' },
            { icon: Shield, label: 'Expand city', desc: 'Up to 10,000 sqm territory', color: 'text-neon-cyan' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl glass-sm flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-space-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : battles.length === 0 ? (
        <div className="glass p-12 text-center">
          <Swords className="w-12 h-12 text-space-600 mx-auto mb-3" />
          <p className="text-space-400">No upcoming battles scheduled</p>
          <p className="text-xs text-space-500 mt-1">Check back soon — battles run weekly</p>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle, idx) => {
            const isActive = new Date(battle.starts_at) <= new Date() && new Date(battle.ends_at) > new Date();
            const isUpcoming = new Date(battle.starts_at) > new Date();
            return (
              <motion.div
                key={battle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`glass p-5 relative overflow-hidden ${isActive ? 'border border-neon-purple/40' : 'border border-white/5'}`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
                )}

                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-neon-purple/20 border border-neon-purple/40' : 'bg-space-700/50 border border-space-600/30'
                    }`}>
                      <Swords className={`w-7 h-7 ${isActive ? 'text-neon-purple' : 'text-space-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isActive && (
                          <span className="text-xs px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/40 text-neon-purple rounded-full font-mono font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                        <h3 className="font-display font-bold text-white text-base sm:text-lg">{battle.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-space-400">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {battle.participant_count} participants
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {isActive ? 'Ends in ' : isUpcoming ? 'Starts ' : 'Ended '}
                          <Countdown endsAt={isActive ? battle.ends_at : battle.starts_at} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                    {battle.is_enrolled ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Enrolled
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(battle.id)}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        Join Battle
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rewards preview */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3 text-xs text-space-400">
                  <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
                  <span>Top 10% earn bonus territory expansion</span>
                  <Zap className="w-3.5 h-3.5 text-neon-cyan ml-auto" />
                  <span>Points from workouts count during battle</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
