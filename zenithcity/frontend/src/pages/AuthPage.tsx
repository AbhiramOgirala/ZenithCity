import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, Mail, Lock, User, ArrowRight, Building2, Sparkles, Scale, Ruler, Calendar, HeartPulse, Target, Dumbbell, ArrowLeft, Wind } from 'lucide-react';
import { login, register, clearError } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: Target, emoji: '🔥', desc: 'Burn calories and shed fat', color: 'neon-orange' },
  { id: 'strength', label: 'Strength', icon: Dumbbell, emoji: '💪', desc: 'Build muscle and power', color: 'neon-cyan' },
  { id: 'endurance', label: 'Endurance', icon: Wind, emoji: '🏃', desc: 'Increase stamina and cardio', color: 'neon-green' },
];

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [regStep, setRegStep] = useState(1);
  const [form, setForm] = useState({ 
    email: '', password: '', username: '',
    fitness_goal: 'weight_loss',
    height_cm: '', weight_kg: '', age: '',
    gender: '', health_issues: '',
    target_weight_kg: '', time_period_weeks: '', time_per_day_minutes: '30'
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (token) navigate('/dashboard');
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      const result = await dispatch(login({ email: form.email, password: form.password }));
      if (result.meta.requestStatus === 'fulfilled') navigate('/dashboard');
    } else {
      const result = await dispatch(register(form));
      if (result.meta.requestStatus === 'fulfilled') navigate('/onboarding');
    }
  };

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    dispatch(clearError());
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 4 + 3, delay: Math.random() * 3,
  }));

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden" role="main">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full bg-neon-cyan/20" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }} animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-8">
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-space-600/20 border border-neon-cyan/30 flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(0,245,255,0.2)' }}>
            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-neon-cyan" aria-hidden="true" />
          </motion.div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-gradient-cyan tracking-wide uppercase">ZENITHCITY</h1>
          <p className="text-space-400 text-sm mt-1 font-body">Transform workouts into empires</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass cyber-border p-6 sm:p-8">
          <div className="flex glass-sm p-1 rounded-xl mb-6 sm:mb-8" role="tablist" aria-label="Authentication mode">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); dispatch(clearError()); }} role="tab" aria-selected={mode === m} className={`flex-1 py-2.5 text-xs font-display font-semibold tracking-wider uppercase rounded-lg transition-all duration-200 ${mode === m ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30' : 'text-space-400 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type="email" placeholder="Email address" value={form.email} onChange={setField('email')} className="input-field pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={setField('password')} className="input-field pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-space-500 hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3.5">
                    {loading ? <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" /> : <>Launch into ZenithCity <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type="text" placeholder="Username" value={form.username} onChange={setField('username')} className="input-field pl-10" required />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type="email" placeholder="Email address" value={form.email} onChange={setField('email')} className="input-field pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={setField('password')} className="input-field pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-space-500 hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3.5">
                     {loading ? <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" /> : <>Building My Empire <Zap className="w-4 h-4 fill-current" /></>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
               <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-neon-pink text-xs font-body bg-neon-pink/10 border border-neon-pink/20 rounded-lg px-3 py-2">
                 {error}
               </motion.p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
