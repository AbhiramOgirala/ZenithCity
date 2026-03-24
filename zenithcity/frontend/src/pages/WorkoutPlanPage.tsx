import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Dumbbell, Clock, ArrowRight, Target, Zap,
  ChevronDown, ChevronUp, Play, RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface Exercise {
  type: string;
  name: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  rest_seconds: number;
  notes: string;
}

interface PlanDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  goal: string;
  level: string;
  days_per_week: number;
  plan: PlanDay[];
  diet_plan?: string[];
  tips: string[];
}

const EXERCISE_EMOJIS: Record<string, string> = {
  squat: '🏋️', pushup: '💪', lunge: '🦵', plank: '🧘',
  jumping_jack: '⚡', cardio: '🏃', running: '🏃', walking: '🚶',
};

const DAY_COLORS: Record<string, string> = {
  Monday: 'neon-cyan', Tuesday: 'neon-orange', Wednesday: 'neon-green',
  Thursday: 'neon-purple', Friday: 'neon-pink', Saturday: 'neon-yellow', Sunday: 'neon-cyan',
};

function formatDuration(secs: number): string {
  if (secs >= 60) return `${Math.floor(secs / 60)} min`;
  return `${secs}s`;
}

export default function WorkoutPlanPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = async () => {
    try {
      const data = await api.get('/workout-plan');
      setPlan(data);
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayDay = data.plan.find((d: PlanDay) => d.day === today);
      if (todayDay) setExpandedDay(today);
      else if (data.plan.length > 0) setExpandedDay(data.plan[0].day);
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlan(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlan();
    setRefreshing(false);
  };

  const handleExerciseClick = (exerciseType: string) => {
    navigate(`/workout?exercise=${exerciseType}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-space-400 font-mono text-sm">Generating your workout plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="glass p-8 text-center space-y-4">
          <Target className="w-12 h-12 text-neon-cyan mx-auto" />
          <h2 className="text-xl font-display font-bold text-white">No Plan Available</h2>
          <p className="text-space-400 text-sm">Complete your onboarding to get a personalized workout plan.</p>
          <Link to="/onboarding" className="btn-primary inline-flex items-center gap-2">
            Set Up Profile <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Your Workout Plan</h1>
          <p className="text-space-400 text-sm mt-0.5">
            Personalized for <span className="text-neon-cyan font-semibold">{plan.goal}</span> &bull; {plan.level} level
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="glass-sm px-3 py-2 rounded-xl flex items-center gap-2 text-space-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-mono">Refresh</span>
        </button>
      </motion.div>

      {/* Plan overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="glass-sm p-4 text-center rounded-xl">
          <Target className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="font-display font-bold text-white text-lg">{plan.goal}</p>
          <p className="text-xs text-space-500">Goal</p>
        </div>
        <div className="glass-sm p-4 text-center rounded-xl">
          <Calendar className="w-5 h-5 text-neon-orange mx-auto mb-2" />
          <p className="font-display font-bold text-white text-lg">{plan.days_per_week}</p>
          <p className="text-xs text-space-500">Days / Week</p>
        </div>
        <div className="glass-sm p-4 text-center rounded-xl">
          <Zap className="w-5 h-5 text-neon-yellow mx-auto mb-2" />
          <p className="font-display font-bold text-white text-lg capitalize">{plan.level}</p>
          <p className="text-xs text-space-500">Level</p>
        </div>
      </motion.div>

      {/* Daily plans */}
      <div className="space-y-3">
        {plan.plan.map((day, i) => {
          const isExpanded = expandedDay === day.day;
          const isToday = day.day === today;
          const color = DAY_COLORS[day.day] || 'neon-cyan';

          return (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass overflow-hidden ${isToday ? `border border-${color}/30 ring-1 ring-${color}/20` : ''}`}
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isToday ? `bg-${color}/15 border border-${color}/30` : 'bg-space-800 border border-space-700'
                  }`}>
                    <Calendar className={`w-4 h-4 ${isToday ? `text-${color}` : 'text-space-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-display font-bold text-sm ${isToday ? `text-${color}` : 'text-white'}`}>
                      {day.day}
                      {isToday && (
                        <span className="ml-2 text-xs font-mono bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-space-500">{day.focus} &bull; {day.exercises.length} exercises</p>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-space-400" />
                  : <ChevronDown className="w-4 h-4 text-space-400" />
                }
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-space-500 font-mono">Tap an exercise to start it</p>

                      {day.exercises.map((ex, j) => (
                        <motion.button
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.05 }}
                          onClick={() => handleExerciseClick(ex.type)}
                          className="w-full flex items-center gap-3 p-3 glass-sm rounded-xl border border-transparent hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all text-left group"
                        >
                          <span className="text-2xl flex-shrink-0 w-10 text-center">
                            {EXERCISE_EMOJIS[ex.type] || '🏋️'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors">
                              {ex.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-space-400 font-mono">
                              {ex.duration_seconds ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {formatDuration(ex.duration_seconds)}
                                </span>
                              ) : (
                                <span>{ex.sets} x {ex.reps} reps</span>
                              )}
                              {ex.rest_seconds > 0 && (
                                <span className="text-space-500">{ex.rest_seconds}s rest</span>
                              )}
                            </div>
                            <p className="text-xs text-space-500 mt-1">{ex.notes}</p>
                          </div>
                          <Play className="w-4 h-4 text-space-600 group-hover:text-neon-cyan transition-colors flex-shrink-0" />
                        </motion.button>
                      ))}

                      {isToday && (
                        <Link
                          to="/workout"
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                        >
                          <Dumbbell className="w-4 h-4" /> Start Today's Workout
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Diet Plan */}
      {plan.diet_plan && plan.diet_plan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-5 space-y-3 border border-neon-orange/20"
        >
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2">
            <span className="text-neon-orange text-lg">🥗</span>
            Nutrition &amp; Diet Guidelines
          </h3>
          <div className="space-y-3 mt-2">
            {plan.diet_plan.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 bg-space-800/30 p-3 rounded-lg border border-space-700/50">
                <span className="text-neon-orange mt-0.5">•</span>
                <span className="text-sm text-space-300 leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {plan.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-5 space-y-3"
        >
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-yellow" />
            Pro Tips
          </h3>
          <div className="space-y-2">
            {plan.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-space-400">
                <span className="text-neon-yellow mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
