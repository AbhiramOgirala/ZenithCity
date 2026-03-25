import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowRight, Apple, RefreshCw, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface MealDetails {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
}

interface DietDay {
  breakfast: string | MealDetails;
  mid_snack: string | MealDetails;
  lunch: string | MealDetails;
  snacks: string | MealDetails;
  dinner: string | MealDetails;
  daily_calories?: number;
  daily_protein?: number;
  daily_carbs?: number;
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
    await fetchPlan(true); 
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-space-400 font-mono text-sm">Consulting AI Dietitian...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-3xl mx-auto"><div className="glass p-8 text-center space-y-4"><Target className="w-12 h-12 text-neon-orange mx-auto" /><h2 className="text-xl font-display font-bold text-white">No Nutrition Plan Available</h2><p className="text-space-400 text-sm">Complete your profile to generate a Gemini diet plan.</p><Link to="/profile" className="btn-primary inline-flex items-center gap-2">Set Up Profile <ArrowRight className="w-4 h-4" /></Link></div></div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 flex flex-col h-full overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between"><div><h1 className="text-2xl font-display font-bold text-white flex items-center gap-3"><span className="text-neon-orange text-3xl">🥗</span> AI Daily Nutrition</h1><p className="text-space-400 text-sm mt-1">Personalized meals optimized for <span className="text-neon-orange font-semibold">{plan.goal}</span>.</p></div><button onClick={handleRefresh} disabled={refreshing} className="glass-sm px-3 py-2 rounded-xl flex items-center gap-2 text-space-400 hover:text-white transition-all"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /><span className="text-xs font-mono">Regenerate</span></button></motion.div>

      {plan.diet_plan ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto pr-2 pb-6 flex-1 touch-scroll">
          {Object.entries(plan.diet_plan).map(([day, meals], idx) => (
            <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="glass p-5 rounded-2xl border border-neon-orange/20 flex flex-col h-full bg-space-900/40">
              <h3 className="font-display font-bold text-neon-orange border-b border-space-700/50 pb-3 mb-4 uppercase tracking-widest text-sm text-center">{day}</h3>
              {meals.daily_calories && (
                <div className="flex items-center justify-around bg-space-800/50 p-2 rounded-xl mb-4 text-xs font-mono text-space-300">
                  <span className="flex flex-col items-center"><b className="text-white">{meals.daily_calories}</b><span className="text-[9px] text-space-500 uppercase mt-0.5">kcal</span></span>
                  <span className="w-px h-6 bg-space-700/50"></span>
                  <span className="flex flex-col items-center"><b className="text-neon-cyan">{meals.daily_protein}g</b><span className="text-[9px] text-space-500 uppercase mt-0.5">Protein</span></span>
                  <span className="w-px h-6 bg-space-700/50"></span>
                  <span className="flex flex-col items-center"><b className="text-neon-green">{meals.daily_carbs}g</b><span className="text-[9px] text-space-500 uppercase mt-0.5">Carbs</span></span>
                </div>
              )}
              <div className="space-y-4 flex-1">
                {['breakfast', 'mid_snack', 'lunch', 'snacks', 'dinner'].map(mealKey => {
                   const mealVal = meals[mealKey as keyof DietDay];
                   if (!mealVal) return null;
                   
                   const isObj = typeof mealVal === 'object';
                   const description = isObj ? (mealVal as MealDetails).description : (mealVal as string);
                   
                   return (
                     <div key={mealKey} className="group relative">
                       <span className="text-[10px] font-mono font-bold text-space-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                         <Apple className={`w-3 h-3 ${mealKey === 'breakfast' ? 'text-neon-cyan' : mealKey === 'lunch' ? 'text-neon-green' : mealKey === 'dinner' ? 'text-neon-pink' : 'text-neon-yellow'}`} /> 
                         {mealKey.replace('_', ' ')}
                       </span>
                       <p className={`text-sm text-white font-medium leading-snug w-fit ${isObj ? 'cursor-help border-b border-dashed border-space-500/50' : ''}`}>
                         {description}
                       </p>
                       
                       {isObj && (
                         <div className="absolute left-0 bottom-full mb-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-space-900 p-3 rounded-xl border border-neon-cyan/30 text-xs shadow-2xl z-20 font-mono">
                           <div className="flex justify-between text-space-300 pb-1 mb-1 border-b border-space-700/50"><span>Calories</span> <span className="text-white font-bold">{(mealVal as MealDetails).calories} kcal</span></div>
                           <div className="flex justify-between text-space-300 py-0.5"><span>Protein</span> <span className="text-neon-cyan">{(mealVal as MealDetails).protein}g</span></div>
                           <div className="flex justify-between text-space-300 py-0.5"><span>Carbs</span> <span className="text-neon-green">{(mealVal as MealDetails).carbs}g</span></div>
                           <div className="flex justify-between text-space-300 py-0.5"><span>Fat</span> <span className="text-neon-orange">{(mealVal as MealDetails).fat}g</span></div>
                           <div className="flex justify-between text-space-300 pt-0.5"><span>Sugar</span> <span className="text-neon-pink">{(mealVal as MealDetails).sugar}g</span></div>
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="glass p-6 text-center"><p className="text-space-400">Diet plan synchronization pending update.</p></div>
      )}

      {plan.tips && plan.tips.length > 0 && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-5 space-y-3 bg-neon-yellow/5 border-neon-yellow/10">
           <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2 pr-2 border-b border-white/5 pb-2 mb-2"><Zap className="w-4 h-4 text-neon-yellow fill-current" /> AI Nutrition Wisdom</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 pr-2">
             {plan.tips.map((tip, i) => (
               <div key={i} className="flex items-start gap-2.5 text-xs text-space-400"><span className="text-neon-yellow mt-0.5">•</span><span>{tip}</span></div>
             ))}
           </div>
         </motion.div>
      )}
    </div>
  );
}
