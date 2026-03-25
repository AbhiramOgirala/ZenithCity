import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { User, Lock, Eye, Award, Swords, Shield, Zap, Save, Settings, Dumbbell, Calendar, Ruler, Weight, HeartPulse, Target, Watch } from 'lucide-react';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { RootState, AppDispatch } from '../store';

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  
  const [username, setUsername] = useState(user?.username || '');
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(user?.privacy_mode || false);
  const [battleAutoEnroll, setBattleAutoEnroll] = useState(user?.battle_auto_enroll !== false);
  
  const [fitnessGoal, setFitnessGoal] = useState(user?.fitness_goal || 'weight_loss');
  const [fitnessLevel, setFitnessLevel] = useState(user?.fitness_level || 'beginner');
  const [height, setHeight] = useState<string | number>(user?.height_cm || '');
  const [weight, setWeight] = useState<string | number>(user?.weight_kg || '');
  const [age, setAge] = useState<string | number>(user?.age || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [healthIssues, setHealthIssues] = useState(user?.health_issues || '');
  
  const [targetWeight, setTargetWeight] = useState<string | number>(user?.target_weight_kg || '');
  const [timePeriod, setTimePeriod] = useState<string | number>(user?.time_period_weeks || '');
  const [timePerDay, setTimePerDay] = useState<string | number>(user?.time_per_day_minutes || '');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    dispatch(fetchProfile()); 
    const params = new URLSearchParams(window.location.search);
    if (params.get('watch_synced')) {
      if (params.get('watch_synced') === 'error') {
        dispatch(addToast({ type: 'error', message: 'Failed to sync watch.' }));
      } else {
        localStorage.setItem('watch_connected', 'true');
        setIsWatchConnected(true);
        dispatch(addToast({ type: 'success', message: 'Smartwatch synced successfully!' }));
      }
      window.history.replaceState({}, '', '/profile');
    }
  }, [dispatch]);
  
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setPrivacyMode(user.privacy_mode || false);
      setBattleAutoEnroll(user.battle_auto_enroll !== false);
      if (user.fitness_goal) setFitnessGoal(user.fitness_goal);
      if (user.fitness_level) setFitnessLevel(user.fitness_level);
      if (user.height_cm) setHeight(user.height_cm);
      if (user.weight_kg) setWeight(user.weight_kg);
      if (user.age) setAge(user.age);
      if (user.gender) setGender(user.gender);
      if (user.health_issues) setHealthIssues(user.health_issues);
      if (user.target_weight_kg) setTargetWeight(user.target_weight_kg);
      if (user.time_period_weeks) setTimePeriod(user.time_period_weeks);
      if (user.time_per_day_minutes) setTimePerDay(user.time_per_day_minutes);
      if ((user as any).watch_connected || localStorage.getItem('watch_connected') === 'true') {
        setIsWatchConnected(true);
      }
    }
  }, [user]);

  const handleConnectWatch = async () => {
    try {
      const data = await api.get('/watch/connect');
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to connect to Strava' }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { 
        username, privacy_mode: privacyMode, battle_auto_enroll: battleAutoEnroll,
        fitness_goal: fitnessGoal, fitness_level: fitnessLevel, height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null, age: age ? Number(age) : null,
        gender: gender || null, health_issues: healthIssues || null,
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        time_period_weeks: timePeriod ? Number(timePeriod) : null,
        time_per_day_minutes: timePerDay ? Number(timePerDay) : null
      });
      dispatch(addToast({ type: 'success', message: 'Profile updated!' }));
      dispatch(fetchProfile());
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Profile</h1>
        <p className="text-space-400 text-sm mt-0.5">Manage your account and fitness metrics</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-neon-cyan/30 flex items-center justify-center text-2xl sm:text-3xl font-display font-black text-neon-cyan" style={{ boxShadow: '0 0 20px rgba(0,245,255,0.2)' }} aria-hidden="true">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {user?.technique_mastery_badge && (
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neon-yellow/20 border border-neon-yellow/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-neon-yellow" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-lg sm:text-xl font-display font-bold text-white">{user?.username}</h2>
          <p className="text-space-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs font-mono text-neon-yellow">
              <Zap className="w-3.5 h-3.5" /> {user?.points_balance?.toLocaleString() || 0} pts
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-4 sm:p-6 space-y-6" role="form" aria-label="Profile settings">
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-neon-cyan" /> Account Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="username-input" className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">Username</label>
            <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" aria-hidden="true" /><input id="username-input" type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-field pl-10" /></div>
          </div>
          <div className="flex items-center justify-between p-4 glass-sm rounded-xl">
            <div className="flex items-center gap-3"><Eye className="w-5 h-5 text-neon-purple" /><div><p className="text-sm font-semibold text-white">Privacy Mode</p><p className="text-xs text-space-500">Anonymous on leaderboards</p></div></div>
            <button onClick={() => setPrivacyMode(!privacyMode)} role="switch" aria-checked={privacyMode} aria-label="Toggle privacy mode" className={`w-12 h-6 rounded-full transition-all relative ${privacyMode ? 'bg-neon-purple' : 'bg-space-700'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${privacyMode ? 'left-6' : 'left-0.5'}`} /></button>
          </div>
          
          <div className="flex items-center justify-between p-4 glass-sm rounded-xl border border-neon-cyan/20">
            <div className="flex items-center gap-3">
              <Watch className="w-5 h-5 text-neon-cyan" />
              <div>
                <p className="text-sm font-semibold text-white">Strava Connection</p>
                <p className="text-xs text-space-500">Sync workouts via Strava</p>
              </div>
            </div>
            {isWatchConnected ? (
              <span className="text-xs font-mono font-bold text-neon-green px-3 py-1 bg-neon-green/20 rounded-full border border-neon-green/40">Connected</span>
            ) : (
              <button onClick={handleConnectWatch} className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 rounded-lg text-xs font-bold uppercase hover:bg-neon-cyan/30 transition-colors">
                Connect
              </button>
            )}
          </div>
        </div>

        <hr className="border-space-700/50 my-6" />
        <h3 className="font-display font-semibold text-sm text-neon-orange flex items-center gap-2 mb-4"><Zap className="w-4 h-4" /> Customized AI Params</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">Fitness Goal</label>
            <select value={fitnessGoal} onChange={e => setFitnessGoal(e.target.value)} className="input-field appearance-none bg-space-900 border border-space-700/50 text-white rounded-xl">
              <option value="weight_loss">Weight Loss</option>
              <option value="strength">Strength Building</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="endurance">Endurance Training</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2 text-neon-cyan">Fitness Level</label>
            <select value={fitnessLevel} onChange={e => setFitnessLevel(e.target.value)} className="input-field appearance-none bg-space-900 border border-neon-cyan/20 text-white rounded-xl ring-1 ring-neon-cyan/10">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div><label className="block text-[10px] font-mono text-space-400 uppercase tracking-widest mb-2">Gender</label><div className="relative"><select value={gender} onChange={e => setGender(e.target.value)} className="input-field appearance-none bg-space-900 border border-space-700/50 text-white rounded-xl"><option value="" disabled>Select...</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div></div>
          <div><label className="block text-[10px] font-mono text-space-400 uppercase tracking-widest mb-2">Height (cm)</label><div className="relative"><Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-space-500" /><input type="number" value={height} onChange={e => setHeight(e.target.value)} className="input-field pl-8" /></div></div>
          <div><label className="block text-[10px] font-mono text-space-400 uppercase tracking-widest mb-2">Weight (kg)</label><div className="relative"><Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-space-500" /><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="input-field pl-8" /></div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div><label className="block text-[10px] font-mono text-space-400 uppercase tracking-widest mb-2">Age</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-space-500" /><input type="number" value={age} onChange={e => setAge(e.target.value)} className="input-field pl-8" /></div></div>
          <div><label className="block text-[10px] font-mono text-neon-orange uppercase tracking-widest mb-2">Target Wt (kg)</label><input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} className="input-field border-neon-orange/20" /></div>
          <div><label className="block text-[10px] font-mono text-neon-orange uppercase tracking-widest mb-2">Weeks</label><input type="number" value={timePeriod} onChange={e => setTimePeriod(e.target.value)} className="input-field border-neon-orange/20" /></div>
        </div>
        <div className="grid sm:grid-cols-1 gap-4 mb-4">
          <div><label className="block text-[10px] font-mono text-neon-orange uppercase tracking-widest mb-2">Mins/Day</label><input type="number" value={timePerDay} onChange={e => setTimePerDay(e.target.value)} className="input-field border-neon-orange/20" /></div>
        </div>

        <div className="mb-4"><label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2 flex items-center gap-1"><HeartPulse className="w-3 h-3 text-neon-pink" /> Health issues/injuries</label><textarea value={healthIssues} onChange={e => setHealthIssues(e.target.value)} className="input-field resize-none h-20 p-3 bg-space-900 border border-space-700/50 text-white rounded-xl" placeholder="e.g. Bad knees..." /></div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-6" aria-label="Save profile settings">{saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Saving"/> : <><Save className="w-4 h-4" aria-hidden="true" /> Save All Fitness Settings</>}</button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-sm p-4 border border-neon-cyan/10 rounded-xl flex items-start gap-3">
        <Shield className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" /><div className="text-xs text-space-400 space-y-1"><p className="font-semibold text-white">Privacy First</p><p>AI camera processing runs locally on your device. No video is uploaded.</p></div>
      </motion.div>
    </div>
  );
}
