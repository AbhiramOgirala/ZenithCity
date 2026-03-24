import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Dumbbell, Wind, Ruler, Weight, Calendar,
  ArrowRight, ArrowLeft, Zap, CheckCircle, Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { AppDispatch } from '../store';

const GOALS = [
  {
    id: 'weight_loss',
    label: 'Weight Loss',
    icon: Target,
    emoji: '🔥',
    desc: 'Burn calories and shed fat with HIIT-focused workouts',
    color: 'neon-orange',
    gradient: 'from-neon-orange/20 to-neon-pink/10',
  },
  {
    id: 'strength',
    label: 'Strength',
    icon: Dumbbell,
    emoji: '💪',
    desc: 'Build muscle and power with progressive bodyweight training',
    color: 'neon-cyan',
    gradient: 'from-neon-cyan/20 to-neon-purple/10',
  },
  {
    id: 'endurance',
    label: 'Endurance',
    icon: Wind,
    emoji: '🏃',
    desc: 'Increase stamina with cardio-focused routines and longer runs',
    color: 'neon-green',
    gradient: 'from-neon-green/20 to-neon-cyan/10',
  },
];

export default function OnboardingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);

  const canProceedStep0 = !!goal;
  const canProceedStep1 = true; // Body metrics are optional

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/auth/onboarding', {
        fitness_goal: goal,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        age: age ? parseInt(age) : null,
      });
      await dispatch(fetchProfile());
      dispatch(addToast({ type: 'success', message: '🎉 Welcome to ZenithCity! Your personalized plan is ready.' }));
      navigate('/dashboard');
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    } finally {
      setSaving(false);
    }
  };

  // Floating particles
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 4 + 3, delay: Math.random() * 3,
  }));

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-neon-cyan/15"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
        />
      ))}

      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center"
            style={{ boxShadow: '0 0 30px rgba(0,245,255,0.15)' }}
          >
            <Sparkles className="w-8 h-8 text-neon-cyan" />
          </motion.div>
          <h1 className="font-display font-black text-2xl text-white">Set Up Your Empire</h1>
          <p className="text-space-400 text-sm mt-1">Tell us your goals so we can create your perfect workout plan</p>
        </motion.div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 px-4">
          {[0, 1].map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-space-800">
              <motion.div
                animate={{ width: step >= s ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
                className={`h-full rounded-full ${step >= s ? 'bg-neon-cyan' : ''}`}
              />
            </div>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass p-6 space-y-4"
            >
              <h2 className="font-display font-bold text-white text-lg">
                What's your primary fitness goal?
              </h2>

              <div className="space-y-3">
                {GOALS.map(g => {
                  const Icon = g.icon;
                  const isSelected = goal === g.id;
                  return (
                    <motion.button
                      key={g.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setGoal(g.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                        isSelected
                          ? `border-${g.color}/50 bg-gradient-to-r ${g.gradient} ring-1 ring-${g.color}/30`
                          : 'border-space-700/40 hover:border-space-500/50 bg-space-800/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? `bg-${g.color}/20 border border-${g.color}/30` : 'bg-space-800 border border-space-700'
                      }`}>
                        <span className="text-2xl">{g.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <p className={`font-display font-bold text-sm ${isSelected ? 'text-white' : 'text-space-300'}`}>
                          {g.label}
                        </p>
                        <p className="text-xs text-space-500 mt-0.5">{g.desc}</p>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <CheckCircle className={`w-5 h-5 text-${g.color}`} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={!canProceedStep0}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-semibold text-sm tracking-wider uppercase transition-all ${
                  canProceedStep0
                    ? 'btn-primary'
                    : 'bg-space-800/50 border border-space-700/30 text-space-500 cursor-not-allowed'
                }`}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass p-6 space-y-5"
            >
              <div>
                <h2 className="font-display font-bold text-white text-lg">Body Metrics</h2>
                <p className="text-xs text-space-500 mt-1">Optional — helps personalize intensity and recovery</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">
                    Height (cm)
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input
                      type="number"
                      placeholder="e.g. 175"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      className="input-field pl-10"
                      min="50" max="300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">
                    Weight (kg)
                  </label>
                  <div className="relative">
                    <Weight className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input
                      type="number"
                      placeholder="e.g. 72"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="input-field pl-10"
                      min="20" max="400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">
                    Age
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="input-field pl-10"
                      min="10" max="120"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-space-700/40 text-space-400 hover:text-white hover:border-space-500 transition-all text-sm font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <motion.button
                  onClick={handleSubmit}
                  disabled={saving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-3.5"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Launch My Empire
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-space-600 mt-6">
          You can update these in your profile settings anytime
        </p>
      </div>
    </div>
  );
}
