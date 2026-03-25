import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Zap, Camera, CameraOff, MapPin, CheckCircle,
  X, AlertCircle, Activity, TrendingUp,
} from 'lucide-react';
import { startWorkout, completeWorkout, clearLastCompleted } from '../store/slices/workoutSlice';
import { fetchDashboard } from '../store/slices/dashboardSlice';
import { addToast } from '../store/slices/uiSlice';
import { RootState, AppDispatch } from '../store';
import WorkoutHistory from '../components/WorkoutHistory';
import PoseDetector from '../components/PoseDetector';

const EXERCISE_TYPES = [
  { id: 'squat',        label: 'Squat',        emoji: '🏋️', type: 'strength', color: 'neon-orange', desc: '2 pts / verified rep' },
  { id: 'pushup',       label: 'Push-up',      emoji: '💪', type: 'strength', color: 'neon-cyan',   desc: '2 pts / verified rep' },
  { id: 'lunge',        label: 'Lunge',        emoji: '🦵', type: 'strength', color: 'neon-green',  desc: '2 pts / verified rep' },
  { id: 'plank',        label: 'Plank',        emoji: '🧘', type: 'cardio',   color: 'neon-purple', desc: '10 pts / min w/ camera' },
  { id: 'jumping_jack', label: 'Jumping Jack', emoji: '⚡', type: 'cardio',   color: 'neon-yellow', desc: '10 pts / min w/ camera' },
  { id: 'cardio',       label: 'Cardio',       emoji: '🏃', type: 'cardio',   color: 'neon-pink',   desc: '10 pts / min w/ camera' },
  { id: 'running',      label: 'Running',      emoji: '🏃‍♂️', type: 'gps',  color: 'neon-orange', desc: '50 pts / km via GPS' },
  { id: 'walking',      label: 'Walking',      emoji: '🚶', type: 'gps',      color: 'neon-cyan',   desc: '50 pts / km via GPS' },
];

export interface AIStats {
  totalReps: number;
  validReps: number;
  formAccuracy: number;
  feedback: string;
  poseLandmarks: any[];
  isActive: boolean;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function calcGPSDistance(coords: Array<{ latitude: number; longitude: number }>): number {
  if (coords.length < 2) return 0;
  let total = 0;
  const R = 6371;
  for (let i = 1; i < coords.length; i++) {
    const dLat = (coords[i].latitude  - coords[i-1].latitude)  * Math.PI / 180;
    const dLon = (coords[i].longitude - coords[i-1].longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(coords[i-1].latitude * Math.PI/180) * Math.cos(coords[i].latitude * Math.PI/180) * Math.sin(dLon/2)**2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return total;
}

export default function WorkoutPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const { active_session, loading, last_completed } = useSelector((s: RootState) => s.workout);

  const [selectedExercise, setSelectedExercise] = useState(() => {
    const param = searchParams.get('exercise');
    return EXERCISE_TYPES.find(e => e.id === param) ? param! : 'squat';
  });
  const [cameraEnabled, setCameraEnabled]   = useState(false);
  const [cameraStream, setCameraStream]     = useState<MediaStream | null>(null);
  const [gpsEnabled, setGpsEnabled]         = useState(false);
  const [gpsCoords, setGpsCoords]           = useState<any[]>([]);
  const [gpsWatchId, setGpsWatchId]         = useState<number | null>(null);

  const [aiStats, setAiStats] = useState<AIStats>({
    totalReps: 0, validReps: 0, formAccuracy: 0,
    feedback: '', poseLandmarks: [], isActive: false,
  });

  // ── Timer: counts up while session active, stops immediately on complete ──
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Use session id as the trigger — when it appears, start; when null, stop.
  const sessionId = active_session?.id ?? null;

  useEffect(() => {
    if (sessionId) {
      // New session started
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);

      // Clear any lingering interval first
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 500);
    } else {
      // Session ended — hard stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId]); // ← only fires when session id changes, never on re-render

  const exerciseMeta = EXERCISE_TYPES.find(e => e.id === selectedExercise)!;
  const isStrength   = exerciseMeta?.type === 'strength';
  const isGPS        = exerciseMeta?.type === 'gps';
  const gpsDistance  = calcGPSDistance(gpsCoords);

  // Points: 0 without camera (except GPS)
  const estimatedPoints = useCallback(() => {
    if (isGPS)             return Math.floor(gpsDistance * 50);
    if (!cameraEnabled)    return Math.floor((elapsedSeconds / 60) * 5); // Half of cardio points
    if (isStrength)        return aiStats.validReps * 2;
    return Math.floor((elapsedSeconds / 60) * 10);
  }, [cameraEnabled, isStrength, isGPS, aiStats.validReps, elapsedSeconds, gpsDistance]);

  const handleStartWorkout = async () => {
    if (!cameraEnabled && !isGPS) {
      dispatch(addToast({ type: 'warning', message: '📷 Manual mode (no AI) will earn 5 pts/min only.' }));
    }
    const result = await dispatch(startWorkout({
      exercise_type: selectedExercise,
      verification_status: cameraEnabled ? 'ai_verified' : 'manual',
    }));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(addToast({ type: 'success', message: `${exerciseMeta.emoji} ${exerciseMeta.label} started!` }));
      if (gpsEnabled && isGPS) startGPS();
    }
  };

  const handleCompleteWorkout = async () => {
    if (!active_session) return;
    if (elapsedSeconds < 30) {
      dispatch(addToast({ type: 'error', message: `Need ${30 - elapsedSeconds}s more` }));
      return;
    }

    // Capture current values before clearing state
    const finalValidReps    = cameraEnabled ? aiStats.validReps    : 0;
    const finalFormAccuracy = cameraEnabled ? aiStats.formAccuracy : 0;
    const finalTotalReps    = aiStats.totalReps;
    const capturedCoords    = [...gpsCoords];

    // Stop camera/GPS immediately so user sees the session ended
    stopCamera();
    stopGPS();

    const result = await dispatch(completeWorkout({
      id: active_session.id,
      total_reps: finalTotalReps,
      valid_reps: finalValidReps,
      form_accuracy: finalFormAccuracy,
      verification_status: cameraEnabled ? 'ai_verified' : 'manual',
      gps_coordinates: capturedCoords,
    }));

    if (result.meta.requestStatus === 'fulfilled') {
      setAiStats({ totalReps: 0, validReps: 0, formAccuracy: 0, feedback: '', poseLandmarks: [], isActive: false });
      setGpsCoords([]);
      dispatch(fetchDashboard());
    } else {
      dispatch(addToast({ type: 'error', message: 'Could not save workout — try again' }));
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
      setCameraEnabled(true);
      console.log('✅ Camera stream obtained:', stream.getVideoTracks()[0].getSettings());
      dispatch(addToast({ type: 'success', message: '🤖 AI pose detection ready!' }));
    } catch (err) {
      console.error('❌ Camera error:', err);
      dispatch(addToast({ type: 'error', message: 'Camera access denied — grant permission to earn points' }));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraEnabled(false);
  };

  const startGPS = () => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setGpsCoords(prev => [...prev, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        altitude: pos.coords.altitude || 0, accuracy: pos.coords.accuracy,
        timestamp: new Date().toISOString(),
      }]),
      () => dispatch(addToast({ type: 'warning', message: 'GPS signal lost' })),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setGpsWatchId(id);
  };

  const stopGPS = () => {
    if (gpsWatchId !== null) { navigator.geolocation.clearWatch(gpsWatchId); setGpsWatchId(null); }
  };

  const pts = estimatedPoints();

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white uppercase tracking-wider">
          {searchParams.get('exercise') ? 'Planned Session' : 'Active Workout'}
        </h1>
        <p className="text-space-400 text-xs sm:text-sm mt-0.5">
          {searchParams.get('exercise') 
            ? `Targeting your ${exerciseMeta.label} for your weekly plan`
            : 'AI verifies your form — only correct reps earn points'
          }
        </p>
      </div>

      {/* Workout completed card */}
      <AnimatePresence>
        {last_completed && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass border border-neon-green/30 p-5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-green/5 to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <p className="font-display font-bold text-white">Workout Complete! 🎉</p>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm">
                    <span className="text-neon-green font-mono font-bold">+{last_completed.points_earned} pts</span>
                    <span className="text-space-400">{last_completed.valid_reps} valid reps</span>
                    <span className="text-space-400">{formatTime(last_completed.duration_seconds || 0)}</span>
                    {last_completed.gps_distance_km > 0 && (
                      <span className="text-neon-cyan">{last_completed.gps_distance_km.toFixed(2)} km</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => dispatch(clearLastCompleted())} className="text-space-500 hover:text-white flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        {/* ─── LEFT: Controls ─── */}
        <div className="lg:col-span-3 space-y-4" role="region" aria-label="Workout controls">

          {/* Exercise selector (only before session starts) */}
          <AnimatePresence>
            {!active_session && !searchParams.get('exercise') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass p-5"
              >
                <h2 className="font-display text-xs font-semibold text-white uppercase tracking-widest mb-3">
                  Choose Exercise
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Exercise type">
                  {EXERCISE_TYPES.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise(ex.id)}
                      role="radio"
                      aria-checked={selectedExercise === ex.id}
                      aria-label={`${ex.label}: ${ex.desc}`}
                      className={`p-2 sm:p-3 rounded-xl border text-center transition-all duration-200 ${
                        selectedExercise === ex.id
                          ? `border-space-400/60 bg-space-700/60 text-white ring-1 ring-neon-cyan/30`
                          : 'border-space-700/40 text-space-400 hover:border-space-500 hover:text-white'
                      }`}
                    >
                      <div className="text-lg sm:text-xl mb-1" aria-hidden="true">{ex.emoji}</div>
                      <p className="text-[10px] sm:text-xs font-semibold leading-tight">{ex.label}</p>
                      <p className="text-[10px] sm:text-xs text-space-500 mt-0.5 font-mono leading-tight hidden sm:block">{ex.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active session display */}
          <AnimatePresence>
            {active_session && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass border border-neon-orange/20 p-6 relative overflow-hidden"
              >
                {/* Pulsing bg */}
                <motion.div
                  animate={{ opacity: [0.04, 0.09, 0.04] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 bg-neon-orange rounded-2xl pointer-events-none"
                />

                <div className="relative space-y-5">
                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-neon-orange animate-pulse" />
                      <span className="font-display text-xs uppercase tracking-widest text-neon-orange font-bold">
                        Active — {exerciseMeta.emoji} {exerciseMeta.label}
                      </span>
                    </div>
                    {cameraEnabled && (
                      <div className="flex items-center gap-1.5 text-xs text-neon-cyan font-mono">
                        <Activity className="w-3.5 h-3.5" />AI tracking
                      </div>
                    )}
                  </div>

                  {/* Big timer */}
                  <div className="text-center" role="timer" aria-label={`Elapsed time: ${formatTime(elapsedSeconds)}`} aria-live="off">
                    <motion.div
                      key={Math.floor(elapsedSeconds / 60)}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="font-display text-5xl sm:text-7xl font-black text-white tabular-nums"
                    >
                      {formatTime(elapsedSeconds)}
                    </motion.div>
                    <p className="text-xs text-space-500 font-mono mt-1">elapsed</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Workout statistics">
                    <div className="glass-sm p-2 sm:p-3 text-center rounded-xl" aria-label={`Total reps: ${aiStats.totalReps}`}>
                      <p className="text-xl sm:text-2xl font-display font-bold text-white">{aiStats.totalReps}</p>
                      <p className="text-[10px] sm:text-xs text-space-500 font-mono">Total Reps</p>
                    </div>
                    <div className="glass-sm p-2 sm:p-3 text-center rounded-xl border border-neon-green/20" aria-label={`Valid reps: ${aiStats.validReps}`}>
                      <p className="text-xl sm:text-2xl font-display font-bold text-neon-green">{aiStats.validReps}</p>
                      <p className="text-[10px] sm:text-xs text-neon-green/70 font-mono">Valid Reps</p>
                    </div>
                    <div className={`glass-sm p-2 sm:p-3 text-center rounded-xl border ${pts > 0 ? 'border-neon-yellow/20' : 'border-space-700/30'}`} aria-label={`Estimated points: ${pts}`}>
                      <p className={`text-xl sm:text-2xl font-display font-bold ${pts > 0 ? 'text-neon-yellow' : 'text-space-500'}`}>{pts}</p>
                      <p className="text-[10px] sm:text-xs text-space-500 font-mono">Est. Pts</p>
                    </div>
                  </div>

                  {/* Form accuracy bar (only when camera on) */}
                  {cameraEnabled && aiStats.formAccuracy > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-space-400 font-mono">Form Accuracy</span>
                        <span className={`font-mono font-bold ${aiStats.formAccuracy >= 0.85 ? 'text-neon-green' : 'text-neon-pink'}`}>
                          {Math.round(aiStats.formAccuracy * 100)}%
                          {aiStats.formAccuracy >= 0.85 ? ' ✓ Valid' : ' ✗ Fix form'}
                        </span>
                      </div>
                      <div className="h-2 bg-space-800 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: `${aiStats.formAccuracy * 100}%` }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className={`h-full rounded-full ${aiStats.formAccuracy >= 0.85 ? 'bg-neon-green' : 'bg-neon-pink'}`}
                        />
                      </div>
                      <p className="text-xs text-space-500 mt-1">{aiStats.feedback}</p>
                    </div>
                  )}

                  {/* No camera warning */}
                  {!cameraEnabled && !isGPS && (
                    <div className="flex items-center gap-2 text-xs text-neon-orange p-2.5 bg-neon-orange/8 border border-neon-orange/20 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Manual mode — partial points (5 pts/min) will be earned
                    </div>
                  )}

                  {/* GPS indicator */}
                  {isGPS && gpsCoords.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-neon-cyan font-mono">
                      <MapPin className="w-3.5 h-3.5 animate-pulse" />
                      {gpsCoords.length} pts · {gpsDistance.toFixed(3)} km
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="space-y-2.5">
            {!active_session ? (
              <div className="flex flex-wrap gap-2.5">
                {/* Camera toggle */}
                {!isGPS && (
                  <button
                    onClick={cameraEnabled ? stopCamera : enableCamera}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                      cameraEnabled
                        ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan shadow-[0_0_12px_rgba(0,245,255,0.15)]'
                        : 'bg-space-800/50 border-space-600/30 text-space-500 hover:text-white hover:border-space-500'
                    }`}
                  >
                    {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                    {cameraEnabled ? 'AI Active' : 'Enable AI Camera'}
                  </button>
                )}

                {/* GPS toggle */}
                {isGPS && (
                  <button
                    onClick={() => setGpsEnabled(g => !g)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                      gpsEnabled
                        ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                        : 'bg-space-800/50 border-space-600/30 text-space-500 hover:text-white'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    GPS {gpsEnabled ? 'On' : 'Off'}
                  </button>
                )}

                <button
                  onClick={handleStartWorkout}
                  disabled={loading}
                  className="flex-1 min-w-[140px] btn-primary flex items-center justify-center gap-2 py-3"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                    : <><Play className="w-4 h-4" />Start {searchParams.get('exercise') ? exerciseMeta.label : 'Workout'}</>
                  }
                </button>
              </div>
            ) : (
              <button
                onClick={handleCompleteWorkout}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-display font-semibold text-sm uppercase tracking-widest transition-all ${
                  elapsedSeconds >= 30
                    ? 'bg-neon-green/10 border border-neon-green/40 text-neon-green hover:bg-neon-green/20'
                    : 'bg-space-800/50 border border-space-600/30 text-space-500 cursor-not-allowed'
                }`}
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : <>
                    <Square className="w-4 h-4" />
                    {elapsedSeconds >= 30 ? 'Complete Workout' : `${30 - elapsedSeconds}s until ready`}
                    {elapsedSeconds >= 30 && <CheckCircle className="w-4 h-4" />}
                  </>
                }
              </button>
            )}
          </div>

          {!searchParams.get('exercise') && <WorkoutHistory />}
        </div>

        {/* ─── RIGHT: Camera / Pose Detection ─── */}
        <div className="lg:col-span-2 space-y-3" role="region" aria-label="Camera and AI detection">
          <div className="glass overflow-hidden rounded-2xl" style={{ minHeight: 280 }}>
            {cameraEnabled && cameraStream ? (
              <PoseDetector
                stream={cameraStream}
                exerciseType={selectedExercise}
                isActive={!!active_session}
                onStatsUpdate={setAiStats}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-6 sm:p-8 h-full min-h-[280px]">
                <div className="w-16 h-16 rounded-2xl bg-space-700/50 border border-space-600/30 flex items-center justify-center">
                  <CameraOff className="w-8 h-8 text-space-500" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-semibold text-white">AI Pose Detection</p>
                  <p className="text-xs text-space-500 leading-relaxed max-w-[200px]">
                    Enable camera so MediaPipe AI can analyze your joint angles and verify each rep in real-time
                  </p>
                </div>
                {isGPS && (
                  <div className="text-center">
                    <MapPin className="w-6 h-6 text-neon-green mx-auto mb-2" />
                    <p className="text-xs text-neon-green font-semibold">GPS Mode</p>
                    <p className="text-xs text-space-500 mt-1">No camera needed — distance via GPS</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Points system explainer */}
          <div className="glass p-4 space-y-3">
            <h3 className="text-xs font-display font-semibold text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-neon-yellow" />
              Points System
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-space-800/50">
                <span className="text-space-300">{exerciseMeta.emoji} {exerciseMeta.label}</span>
                <span className="font-mono text-neon-yellow font-bold">{exerciseMeta.desc}</span>
              </div>

              <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                cameraEnabled ? 'bg-neon-green/5 border-neon-green/20' : 'bg-neon-orange/5 border-neon-orange/20'
              }`}>
                {cameraEnabled
                  ? <CheckCircle className="w-3.5 h-3.5 text-neon-green mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 text-neon-orange mt-0.5 flex-shrink-0" />
                }
                <p className={cameraEnabled ? 'text-neon-green' : 'text-neon-orange'}>
                  {cameraEnabled
                    ? 'AI active — joint angles verified in real-time'
                    : 'Manual mode — reduced points for unverified forms'
                  }
                </p>
              </div>

              <p className="text-space-500 leading-relaxed">
                ≥85% form score → rep counts. AI checks joint angles for correct technique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
