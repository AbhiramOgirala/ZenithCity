import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Clock, Zap, CheckCircle, MapPin, Dumbbell } from 'lucide-react';
import { fetchHistory } from '../store/slices/workoutSlice';
import { RootState, AppDispatch } from '../store';
import LoadingSpinner from './ui/LoadingSpinner';

export default function WorkoutHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const { sessions, loading } = useSelector((s: RootState) => s.workout);

  useEffect(() => { dispatch(fetchHistory(1)); }, [dispatch]);

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (!sessions.length) return null;

  return (
    <div className="glass p-5">
      <h2 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-neon-orange" />
        Recent Workouts
      </h2>
      <div className="space-y-2">
        {sessions.slice(0, 5).map((session, idx) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-3 p-3 glass-sm rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-neon-orange/10 border border-neon-orange/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-neon-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white capitalize">{session.exercise_type}</p>
              <div className="flex items-center gap-3 text-xs text-space-500 font-mono mt-0.5">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s` : '—'}</span>
                {session.valid_reps > 0 && <span>{session.valid_reps} reps</span>}
                {session.gps_distance_km > 0 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.gps_distance_km.toFixed(1)}km</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-sm font-bold text-neon-yellow">
              <Zap className="w-3.5 h-3.5" />
              +{session.points_earned}
            </div>
            {session.verification_status === 'ai_verified' && (
              <CheckCircle className="w-4 h-4 text-neon-green flex-shrink-0" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
