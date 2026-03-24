import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Building2, Target, Dumbbell, Wind, Ruler, Weight, Calendar, HeartPulse, Sparkles } from 'lucide-react';
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
    fitness_goal: '', height_cm: '', weight_kg: '', age: '', gender: '', health_issues: ''
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
      // Register (Multi-step)
      if (regStep === 1) {
        if (!form.username || !form.email || !form.password) return;
        setRegStep(2);
      } else if (regStep === 2) {
        if (!form.fitness_goal) return;
        setRegStep(3);
      } else if (regStep === 3) {
        const payload = {
          ...form,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
          age: form.age ? parseInt(form.age) : undefined,
        };
        const result = await dispatch(register(payload as any));
        if (result.meta.requestStatus === 'fulfilled') navigate('/dashboard');
      }
    }
  };

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    dispatch(clearError());
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 4 + 3, delay: Math.random() * 3,
  }));

  const renderRegisterStep1 = () => (
    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
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
        <input type={showPassword ? 'text' : 'password'} placeholder="Password (8+ chars, 1 uppercase, 1 number)" value={form.password} onChange={setField('password')} className="input-field pl-10 pr-10" required />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-space-500 hover:text-white">
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 mt-2">
        Next Step <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  const renderRegisterStep2 = () => (
    <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
      <h3 className="text-white font-display font-bold text-center mb-2">What is your primary goal?</h3>
      <div className="grid grid-cols-1 gap-3">
        {GOALS.map(g => (
          <button type="button" key={g.id} onClick={() => setForm({ ...form, fitness_goal: g.id })} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${form.fitness_goal === g.id ? `border-${g.color}/50 bg-${g.color}/10 ring-1 ring-${g.color}/30` : 'border-space-700/40 hover:border-space-500/50 bg-space-800/30'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.fitness_goal === g.id ? `bg-${g.color}/20` : 'bg-space-800'}`}>
              <span className="text-xl">{g.emoji}</span>
            </div>
            <div>
              <p className={`font-display font-bold text-sm ${form.fitness_goal === g.id ? 'text-white' : 'text-space-300'}`}>{g.label}</p>
              <p className="text-xs text-space-500">{g.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        <button type="button" onClick={() => setRegStep(1)} className="px-5 py-3.5 rounded-xl border border-space-700/40 text-space-400 hover:text-white transition-all"><ArrowLeft className="w-4 h-4" /></button>
        <button type="submit" disabled={!form.fitness_goal} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-50">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderRegisterStep3 = () => (
    <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
      <h3 className="text-white font-display font-bold text-center mb-2">Almost there! (Optional)</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
          <input type="number" placeholder="Height (cm)" value={form.height_cm} onChange={setField('height_cm')} className="input-field pl-10 text-sm" />
        </div>
        <div className="relative">
          <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
          <input type="number" placeholder="Weight (kg)" value={form.weight_kg} onChange={setField('weight_kg')} className="input-field pl-10 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
          <input type="number" placeholder="Age" value={form.age} onChange={setField('age')} className="input-field pl-10 text-sm" />
        </div>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
          <select value={form.gender} onChange={setField('gender') as any} className="input-field pl-10 text-sm appearance-none bg-space-900 border border-space-700/50 focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 text-white rounded-xl">
            <option value="" disabled>Gender...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="relative">
        <HeartPulse className="absolute left-3.5 top-3.5 w-4 h-4 text-space-500" />
        <input type="text" placeholder="Health issues/injuries (e.g. bad knees)" value={form.health_issues} onChange={setField('health_issues')} className="input-field pl-10 text-sm" />
      </div>

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={() => setRegStep(2)} className="px-5 py-3.5 rounded-xl border border-space-700/40 text-space-400 hover:text-white transition-all"><ArrowLeft className="w-4 h-4" /></button>
        <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3.5">
          {loading ? <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" /> : <> <Sparkles className="w-4 h-4" /> Finalize Setup</>}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full bg-neon-cyan/20" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }} animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-space-600/20 border border-neon-cyan/30 flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(0,245,255,0.2)' }}>
            <Building2 className="w-10 h-10 text-neon-cyan" />
          </motion.div>
          <h1 className="font-display font-black text-3xl text-gradient-cyan tracking-wide">ZENITHCITY</h1>
          <p className="text-space-400 text-sm mt-1 font-body">Transform workouts into empires</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass cyber-border p-8 pb-10">
          
          <div className="flex glass-sm p-1 rounded-xl mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setRegStep(1); dispatch(clearError()); }} className={`flex-1 py-2.5 text-sm font-display font-semibold tracking-wider uppercase rounded-lg transition-all duration-200 ${mode === m ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30' : 'text-space-400 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <div className="flex gap-2 mb-6 px-4">
              {[1, 2, 3].map(step => (
                <div key={step} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${regStep >= step ? 'bg-neon-cyan/80' : 'bg-space-800'}`} />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-0">
            {error && (
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-neon-pink text-sm font-body bg-neon-pink/10 border border-neon-pink/20 rounded-lg px-3 py-2">
                {error}
              </motion.p>
            )}

            {mode === 'login' ? (
              <AnimatePresence mode="wait">
                <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type="text" placeholder="Email or Username" value={form.email} onChange={setField('email')} className="input-field pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={setField('password')} className="input-field pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-space-500 hover:text-white">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 mt-2">
                    {loading ? <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" /> : <> <Zap className="w-4 h-4" /> Launch into ZenithCity </>}
                  </button>
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                {regStep === 1 && renderRegisterStep1()}
                {regStep === 2 && renderRegisterStep2()}
                {regStep === 3 && renderRegisterStep3()}
              </AnimatePresence>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
