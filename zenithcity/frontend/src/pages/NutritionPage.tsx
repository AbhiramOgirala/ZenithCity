import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowRight, Apple, RefreshCw, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface DietDay {
  breakfast: string;
  mid_snack: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

interface WorkoutPlan {
  goal: string;
  diet_plan?: Record<string, DietDay>;
  tips: string[];
}

export default function NutritionPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlan = async (forceRefetch = false) => {
    try {
      const data = await api.get(`/workout-plan${forceRefetch ? '?force=true' : ''}`);
      setPlan(data);
    } catch (err) {
      console.error('Failed to fetch nutrition plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlan(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlan(true); // Force Gemini to generate a brand new plan
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-space-400 font-mono text-sm">Generating your nutrition plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="glass p-8 text-center space-y-4">
          <Target className="w-12 h-12 text-neon-orange mx-auto" />
          <h2 className="text-xl font-display font-bold text-white">No Nutrition Plan Available</h2>
          <p className="text-space-400 text-sm">Complete your onboarding to auto-generate a custom Gemini diet plan.</p>
          <Link to="/onboarding" className="btn-primary inline-flex items-center gap-2">
            Set Up Profile <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <span className="text-neon-orange text-3xl">🥗</span> Daily Nutrition Schedule
          </h1>
          <p className="text-space-400 text-sm mt-1">
            Personalized macros and meals optimized for <span className="text-neon-orange font-semibold">{plan.goal}</span>.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="glass-sm px-3 py-2 rounded-xl flex items-center gap-2 text-space-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-mono">Regenerate</span>
        </button>
      </motion.div>

      {plan.diet_plan && Object.keys(plan.diet_plan).length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {Object.entries(plan.diet_plan).map(([day, meals], idx) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass p-5 rounded-2xl border border-neon-orange/20 flex flex-col h-full"
            >
              <h3 className="font-display font-bold text-neon-orange border-b border-space-700/50 pb-3 mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                {day}
              </h3>
              <div className="space-y-4 flex-1">
                {meals.breakfast && (
                  <div>
                    <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Apple className="w-3 h-3 text-neon-cyan" /> Breakfast</span>
                    <p className="text-sm text-white font-medium leading-snug">{meals.breakfast}</p>
                  </div>
                )}
                {meals.mid_snack && (
                  <div>
                    <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest pb-0.5 mb-1 block">Mid-Snack</span>
                    <p className="text-xs text-space-300 leading-snug">{meals.mid_snack}</p>
                  </div>
                )}
                {meals.lunch && (
                  <div>
                    <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Apple className="w-3 h-3 text-neon-green" /> Lunch</span>
                    <p className="text-sm text-white font-medium leading-snug">{meals.lunch}</p>
                  </div>
                )}
                {meals.snacks && (
                  <div>
                    <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest pb-0.5 mb-1 block">Snacks</span>
                    <p className="text-xs text-space-300 leading-snug">{meals.snacks}</p>
                  </div>
                )}
                {meals.dinner && (
                  <div>
                    <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Apple className="w-3 h-3 text-neon-pink" /> Dinner</span>
                    <p className="text-sm text-white font-medium leading-snug">{meals.dinner}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="glass p-6 text-center">
          <p className="text-space-400">No diet plan available for this routine.</p>
        </div>
      )}

      {plan.tips && plan.tips.length > 0 && (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="glass p-5 space-y-3"
         >
           <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2">
             <Zap className="w-4 h-4 text-neon-yellow" />
             AI Coach Nutrition Tips
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
