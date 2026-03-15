import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { User, Lock, Eye, Award, Swords, Shield, Zap, Save, Settings } from 'lucide-react';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { api } from '../services/api';
import { RootState, AppDispatch } from '../store';

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [username, setUsername] = useState(user?.username || '');
  const [privacyMode, setPrivacyMode] = useState(user?.privacy_mode || false);
  const [battleAutoEnroll, setBattleAutoEnroll] = useState(user?.battle_auto_enroll !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchProfile()); }, [dispatch]);
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setPrivacyMode(user.privacy_mode || false);
      setBattleAutoEnroll(user.battle_auto_enroll !== false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { username, privacy_mode: privacyMode, battle_auto_enroll: battleAutoEnroll });
      dispatch(addToast({ type: 'success', message: 'Profile updated!' }));
      dispatch(fetchProfile());
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Profile</h1>
        <p className="text-space-400 text-sm mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar & stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 flex items-center gap-6"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-neon-cyan/30 flex items-center justify-center text-3xl font-display font-black text-neon-cyan"
            style={{ boxShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {user?.technique_mastery_badge && (
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neon-yellow/20 border border-neon-yellow/40 flex items-center justify-center">
              <Award className="w-4 h-4 text-neon-yellow" />
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">{user?.username}</h2>
          <p className="text-space-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs font-mono text-neon-yellow">
              <Zap className="w-3.5 h-3.5" />
              {user?.points_balance?.toLocaleString() || 0} pts
            </span>
            {user?.technique_mastery_badge && (
              <span className="flex items-center gap-1 text-xs font-mono text-neon-yellow">
                <Award className="w-3.5 h-3.5" />
                Form Master
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 space-y-6"
      >
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-neon-cyan" />
          Account Settings
        </h3>

        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-mono text-space-400 uppercase tracking-widest mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between p-4 glass-sm rounded-xl">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-neon-purple" />
              <div>
                <p className="text-sm font-semibold text-white">Privacy Mode</p>
                <p className="text-xs text-space-500">Show as anonymous on leaderboards</p>
              </div>
            </div>
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                privacyMode ? 'bg-neon-purple' : 'bg-space-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                privacyMode ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Battle auto-enroll */}
          <div className="flex items-center justify-between p-4 glass-sm rounded-xl">
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-neon-orange" />
              <div>
                <p className="text-sm font-semibold text-white">Battle Auto-Enroll</p>
                <p className="text-xs text-space-500">Automatically join territory battles</p>
              </div>
            </div>
            <button
              onClick={() => setBattleAutoEnroll(!battleAutoEnroll)}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                battleAutoEnroll ? 'bg-neon-orange' : 'bg-space-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                battleAutoEnroll ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </motion.div>

      {/* Privacy info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-sm p-4 border border-neon-cyan/10 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
          <div className="text-xs text-space-400 space-y-1">
            <p className="font-semibold text-white text-sm">Privacy First</p>
            <p>All camera processing runs locally on your device. No video footage is uploaded to our servers. Frames are deleted after each workout session.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
