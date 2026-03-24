import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, ArrowRight, Ruler, Scale, 
  Calendar, HeartPulse, Target, 
  Dumbbell, Sparkles, Coffee, Utensils, Trophy
} from 'lucide-react';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { RootState, AppDispatch } from '../store';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    age: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    diet_preference: 'veg',
    fitness_goal: 'weight_loss',
    fitness_level: 'beginner',
    target_weight_kg: '',
    time_period_weeks: '12',
    time_per_day_minutes: '30',
    health_issues: ''
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);

  const handleChange = (k: string, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        target_weight_kg: Number(form.target_weight_kg),
        time_period_weeks: Number(form.time_period_weeks),
        time_per_day_minutes: Number(form.time_per_day_minutes),
        onboarding_completed: true
      });
      await dispatch(fetchProfile());
      setShowSuccess(true);
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: 'Failed to save profile' }));
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-10 text-center space-y-6 max-w-sm relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-neon-green/10 to-transparent pointer-events-none" />
          <motion.div 
            animate={{ y: [-10, 0, -10], rotate: [0, 5, -5, 0] }} 
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 bg-neon-green/20 border border-neon-green/40 rounded-full mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.3)]"
          >
            <Trophy className="w-12 h-12 text-neon-green" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Congratulations!</h2>
            <p className="text-space-400 text-sm">You have completed your foundation and earned a starting bonus.</p>
          </div>
          <div className="glass-sm p-4 rounded-2xl border border-neon-yellow/20 inline-block">
            <p className="text-xs font-mono text-neon-yellow uppercase tracking-widest mb-1">Onboarding Reward</p>
            <p className="text-4xl font-display font-black text-white">+100 <span className="text-neon-yellow">pts</span></p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full btn-primary py-4 text-sm font-bold tracking-widest flex items-center justify-center gap-2"
          >
            Enter The City <Zap className="w-4 h-4 fill-current" />
          </button>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { title: "The Foundation", desc: "Let's start with the basics" },
    { title: "Fuel Your Empire", desc: "What kind of nutrition do you prefer?" },
    { title: "Define Your Goal", desc: "What is your primary objective?" },
    { title: "The Blueprint", desc: "Setting your targets" }
  ];

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step > i ? 'w-8 bg-neon-cyan' : step === i + 1 ? 'w-8 bg-neon-cyan/40' : 'w-2 bg-space-800'
                }`} 
              />
            ))}
          </div>
          <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
            {steps[step-1].title}
          </h1>
          <p className="text-space-400 text-sm">{steps[step-1].desc}</p>
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-8 space-y-6"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Age</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                      <input type="number" value={form.age} onChange={e => handleChange('age', e.target.value)} className="input-field pl-10" placeholder="25" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Gender</label>
                    <div className="relative">
                      <select value={form.gender} onChange={e => handleChange('gender', e.target.value)} className="input-field appearance-none bg-space-900 border border-space-700/50 text-white rounded-xl">
                        <option value="" disabled>Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Height (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                      <input type="number" value={form.height_cm} onChange={e => handleChange('height_cm', e.target.value)} className="input-field pl-10" placeholder="175" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                    <div className="relative">
                      <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                      <input type="number" value={form.weight_kg} onChange={e => handleChange('weight_kg', e.target.value)} className="input-field pl-10" placeholder="70" />
                    </div>
                  </div>
                </div>

                <button onClick={handleNext} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'veg', label: 'Vegetarian', icon: Coffee, desc: 'Plant-based, includes dairy' },
                    { id: 'non-veg', label: 'Non-Vegetarian', icon: Utensils, desc: 'Includes meat, fish, and eggs' },
                    { id: 'vegan', label: 'Vegan', icon: Sparkles, desc: 'Strictly plant-based nutrition' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleChange('diet_preference', item.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        form.diet_preference === item.id 
                          ? 'border-neon-green bg-neon-green/5 ring-1 ring-neon-green/20' 
                          : 'border-space-700/50 bg-space-800/30 hover:border-space-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${form.diet_preference === item.id ? 'bg-neon-green/20 text-neon-green' : 'bg-space-700 text-space-400'}`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-white">{item.label}</p>
                          <p className="text-xs text-space-500">{item.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={handleBack} className="flex-1 py-4 text-space-400 hover:text-white transition-all font-mono text-sm uppercase">Back</button>
                  <button onClick={handleNext} className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1 mb-2 block">Primary Goal</label>
                    <select value={form.fitness_goal} onChange={e => handleChange('fitness_goal', e.target.value)} className="input-field appearance-none bg-space-900 border border-space-700/50 text-white rounded-xl">
                      <option value="weight_loss">Weight Loss</option>
                      <option value="strength">Strength Building</option>
                      <option value="muscle_gain">Muscle Gain</option>
                      <option value="endurance">Endurance Training</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1 mb-2 block">Starting Experience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['beginner', 'intermediate', 'advanced'].map(l => (
                        <button
                          key={l}
                          onClick={() => handleChange('fitness_level', l)}
                          className={`py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                            form.fitness_level === l 
                              ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan ring-1 ring-neon-cyan/30'
                              : 'border-space-700/50 text-space-500 hover:text-white hover:border-space-600'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={handleBack} className="flex-1 py-4 text-space-400 hover:text-white transition-all font-mono text-sm uppercase">Back</button>
                  <button onClick={handleNext} className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Target Wt (kg)</label>
                    <div className="relative">
                      <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                      <input type="number" value={form.target_weight_kg} onChange={e => handleChange('target_weight_kg', e.target.value)} className="input-field pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Period (weeks)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                      <input type="number" value={form.time_period_weeks} onChange={e => handleChange('time_period_weeks', e.target.value)} className="input-field pl-10" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1">Availability (Mins/Day)</label>
                  <div className="relative">
                    <Dumbbell className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input type="number" value={form.time_per_day_minutes} onChange={e => handleChange('time_per_day_minutes', e.target.value)} className="input-field pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-space-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3 text-neon-pink" /> Any Injuries?
                  </label>
                  <textarea value={form.health_issues} onChange={e => handleChange('health_issues', e.target.value)} className="input-field resize-none h-20 p-3" placeholder="Leave empty if none" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={handleBack} className="flex-1 py-4 text-space-400 hover:text-white transition-all font-mono text-sm uppercase">Back</button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,245,255,0.3)]"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Finish & Launch <Zap className="w-4 h-4 fill-current" /></>}
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
