/**
 * PoseDetector — Real AI pose detection using MediaPipe via CDN
 * 
 * Uses @mediapipe/pose loaded from CDN (no npm install needed).
 * Performs real joint-angle analysis for each exercise type.
 * Only counts reps when form accuracy >= 85%.
 * 
 * Architecture: 100% local MediaPipe for real-time rep counting.
 * Gemini is used ONLY for one-shot verification when workout ends.
 * This prevents the infinite session create/close loops.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { AIStats } from '../pages/WorkoutPage';
import { getSocket } from '../services/socket';

interface Props {
  stream: MediaStream;
  exerciseType: string;
  isActive: boolean;
  onStatsUpdate: (stats: AIStats) => void;
}

// ─── Joint angle helpers ────────────────────────────────────────────────────

function getAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// MediaPipe landmark indices
const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  NOSE: 0,
};

// ─── Exercise analyzers ──────────────────────────────────────────────────────

type RepPhase = 'up' | 'down' | 'hold';
interface AnalysisResult {
  repComplete: boolean;
  formScore: number;   // 0–1
  feedback: string;
  phase: RepPhase;
}

function analyzeSquat(lms: any[], prevPhase: RepPhase): AnalysisResult {
  const lHip   = lms[LM.LEFT_HIP];
  const lKnee  = lms[LM.LEFT_KNEE];
  const lAnkle = lms[LM.LEFT_ANKLE];
  const rHip   = lms[LM.RIGHT_HIP];
  const rKnee  = lms[LM.RIGHT_KNEE];
  const rAnkle = lms[LM.RIGHT_ANKLE];
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const rShoulder = lms[LM.RIGHT_SHOULDER];

  if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee || !rAnkle) {
    return { repComplete: false, formScore: 0, feedback: 'Step into frame — full body needed', phase: prevPhase };
  }

  const leftKneeAngle  = getAngle(lHip,  lKnee,  lAnkle);
  const rightKneeAngle = getAngle(rHip,  rKnee,  rAnkle);
  const avgKneeAngle   = (leftKneeAngle + rightKneeAngle) / 2;

  // Check knee alignment (shouldn't cave inward)
  const kneeWidth = Math.abs(lKnee.x - rKnee.x);
  const hipWidth  = Math.abs(lHip.x  - rHip.x);
  const kneesCaved = kneeWidth < hipWidth * 0.6;

  // Check if person is actually standing (not sitting/lying)
  const isStanding = lShoulder && rShoulder && 
    (lShoulder.y < lHip.y - 0.08) && (rShoulder.y < rHip.y - 0.08);

  if (!isStanding) {
    return { repComplete: false, formScore: 0.5, feedback: 'Stand up to perform squats', phase: prevPhase };
  }

  let formScore = 1.0;
  let feedback  = '';

  // Phase detection - RELAXED thresholds for real-world movement
  const isDown = avgKneeAngle < 130;   // Relaxed: 130° instead of 100° (catches partial squats too)
  const isDeep = avgKneeAngle < 100;   // Bonus: deep squat
  const isUp   = avgKneeAngle > 160;   // Standing position
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDown) {
    newPhase = 'down';
  } else if (isUp) {
    newPhase = 'up';
  }

  // Form scoring — graduated, NOT binary
  if (isDown) {
    // In the squat position
    if (isDeep) {
      feedback = '✓ Great depth!';
      formScore = 1.0;
    } else if (avgKneeAngle < 110) {
      feedback = '✓ Good squat!';
      formScore = 0.95;
    } else {
      feedback = 'Try going a bit deeper';
      formScore = 0.85; // Still counts as valid
    }
    if (kneesCaved) { formScore -= 0.2; feedback = 'Knees caving — push them out'; }
  } else if (isUp) {
    // Standing position
    feedback = 'Ready for next rep';
    formScore = 1.0;
    if (kneesCaved) { formScore -= 0.15; feedback = 'Drive knees outward'; }
  } else {
    // TRANSITION — user is moving between positions
    // Give a reasonable score so the UI doesn't flash red constantly
    formScore = 0.88;
    feedback = avgKneeAngle < 145 ? 'Going down... keep going!' : 'Stand tall to complete rep';
  }

  // Rep completed: went from down phase to standing up
  const repComplete = prevPhase === 'down' && isUp;
  
  return { repComplete, formScore: Math.max(0, formScore), feedback, phase: newPhase };
}

function analyzePushup(lms: any[], prevPhase: RepPhase): AnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const lElbow    = lms[LM.LEFT_ELBOW];
  const lWrist    = lms[LM.LEFT_WRIST];
  const rShoulder = lms[LM.RIGHT_SHOULDER];
  const rElbow    = lms[LM.RIGHT_ELBOW];
  const rWrist    = lms[LM.RIGHT_WRIST];
  const lHip      = lms[LM.LEFT_HIP];
  const rHip      = lms[LM.RIGHT_HIP];

  if (!lShoulder || !lElbow || !lWrist || !lHip) {
    return { repComplete: false, formScore: 0, feedback: 'Lie down — camera should see your side profile', phase: prevPhase };
  }

  // Check if person is in plank/pushup position (horizontal body)
  const isHorizontal = lShoulder && lHip && Math.abs(lShoulder.y - lHip.y) < 0.2;
  
  if (!isHorizontal) {
    return { repComplete: false, formScore: 0.5, feedback: 'Get into pushup position (plank)', phase: prevPhase };
  }

  const leftElbowAngle  = getAngle(lShoulder, lElbow, lWrist);
  const rightElbowAngle = rShoulder && rElbow && rWrist ? getAngle(rShoulder, rElbow, rWrist) : leftElbowAngle;
  const avgElbow        = (leftElbowAngle + rightElbowAngle) / 2;

  // Body alignment (hip sag)
  const hipSag = lHip && lShoulder ? (lHip.y - lShoulder.y) > 0.15 : false;

  let formScore = 1.0;
  let feedback  = '';

  // RELAXED phase detection
  const isDown = avgElbow < 110;   // Relaxed from 90
  const isUp   = avgElbow > 155;   // Relaxed from 160
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDown) {
    newPhase = 'down';
  } else if (isUp) {
    newPhase = 'up';
  }

  if (isDown) {
    if (avgElbow < 90) {
      feedback = '✓ Great depth!';
      formScore = 1.0;
    } else {
      feedback = '✓ Good pushup!';
      formScore = 0.9;
    }
    if (hipSag) { formScore -= 0.25; feedback = 'Hips sagging — engage core!'; }
  } else if (isUp) {
    feedback = 'Arms extended — next rep!';
    formScore = 1.0;
    if (hipSag) { formScore -= 0.15; feedback = 'Keep core tight'; }
  } else {
    // Transition
    formScore = 0.88;
    feedback = avgElbow < 135 ? 'Pushing up...' : 'Lower down...';
  }

  const repComplete = prevPhase === 'down' && isUp;
  
  return { repComplete, formScore: Math.max(0, formScore), feedback, phase: newPhase };
}

function analyzeLunge(lms: any[], prevPhase: RepPhase): AnalysisResult {
  const lHip   = lms[LM.LEFT_HIP];
  const lKnee  = lms[LM.LEFT_KNEE];
  const lAnkle = lms[LM.LEFT_ANKLE];
  const rHip   = lms[LM.RIGHT_HIP];
  const rKnee  = lms[LM.RIGHT_KNEE];
  const lShoulder = lms[LM.LEFT_SHOULDER];

  if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee) {
    return { repComplete: false, formScore: 0, feedback: 'Stand sideways — need full body visible', phase: prevPhase };
  }

  const isStanding = lShoulder && lHip && (lShoulder.y < lHip.y - 0.05);
  
  if (!isStanding) {
    return { repComplete: false, formScore: 0.5, feedback: 'Stand up to perform lunges', phase: prevPhase };
  }

  const leftKneeAngle  = getAngle(lHip, lKnee, lAnkle);
  const rightKneeAngle = getAngle(rHip, rKnee, lms[LM.RIGHT_ANKLE] || lAnkle);
  const kneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

  let formScore = 1.0;
  let feedback  = '';

  // RELAXED phase detection
  const isDown = kneeAngle < 120;  // Relaxed from 100
  const isUp   = kneeAngle > 160;  // Relaxed from 165
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDown) {
    newPhase = 'down';
  } else if (isUp) {
    newPhase = 'up';
  }

  if (isDown) {
    if (kneeAngle < 100) {
      feedback = '✓ Great lunge depth!';
      formScore = 1.0;
    } else {
      feedback = '✓ Good lunge!';
      formScore = 0.9;
    }
    if (lKnee.x > lAnkle.x + 0.06) { formScore -= 0.2; feedback = 'Front knee behind toes!'; }
  } else if (isUp) {
    feedback = 'Extend fully between reps';
    formScore = 1.0;
  } else {
    formScore = 0.88;
    feedback = kneeAngle < 140 ? 'Going down...' : 'Stand fully upright!';
  }

  const repComplete = prevPhase === 'down' && isUp;
  
  return { repComplete, formScore: Math.max(0, formScore), feedback, phase: newPhase };
}

function analyzeJumpingJack(lms: any[], prevPhase: RepPhase): AnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const rShoulder = lms[LM.RIGHT_SHOULDER];
  const lWrist    = lms[LM.LEFT_WRIST];
  const rWrist    = lms[LM.RIGHT_WRIST];
  const lAnkle    = lms[LM.LEFT_ANKLE];
  const rAnkle    = lms[LM.RIGHT_ANKLE];

  if (!lShoulder || !rShoulder || !lAnkle || !rAnkle || !lWrist || !rWrist) {
    return { repComplete: false, formScore: 0, feedback: 'Step back — need full body visible', phase: prevPhase };
  }

  // Arms above shoulders
  const armsUp = lWrist.y < lShoulder.y - 0.1 && rWrist.y < rShoulder.y - 0.1;
  
  // Legs wider than shoulders
  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
  const legWidth      = Math.abs(lAnkle.x - rAnkle.x);
  const legsWide      = legWidth > shoulderWidth * 1.5;  // Relaxed from 2.0

  // Arms down
  const armsDown = lWrist.y > lShoulder.y && rWrist.y > rShoulder.y;

  // Legs close together
  const legsClosed = legWidth < shoulderWidth * 1.0;  // Relaxed from 0.8

  // OPEN position: arms up, legs wide
  const isOpen = armsUp && legsWide;
  
  // CLOSED position: arms down, legs together
  const isClosed = armsDown && legsClosed;

  const newPhase: RepPhase = isOpen ? 'up' : isClosed ? 'down' : prevPhase;

  let feedback  = '';
  let formScore = 0.88; // Default transition score

  if (isOpen) {
    feedback = '✓ Full star position!';
    formScore = 1.0;
  } else if (isClosed) {
    feedback = 'Jump and spread!';
    formScore = 1.0;
  } else {
    // Partial — give specific feedback but don't crush the score
    if (armsUp && !legsWide) {
      feedback = 'Spread legs wider!';
      formScore = 0.7;
    } else if (!armsUp && legsWide) {
      feedback = 'Raise arms higher!';
      formScore = 0.7;
    } else if (!armsUp && !armsDown) {
      feedback = 'Raise arms all the way!';
      formScore = 0.6;
    } else {
      feedback = 'Complete the full motion';
      formScore = 0.85;
    }
  }

  const repComplete = prevPhase === 'up' && isClosed;
  
  return { repComplete, formScore, feedback, phase: newPhase };
}

function analyzePlank(lms: any[]): AnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const lHip      = lms[LM.LEFT_HIP];
  const lAnkle    = lms[LM.LEFT_ANKLE];

  if (!lShoulder || !lHip || !lAnkle) {
    return { repComplete: false, formScore: 0, feedback: 'Lie flat — camera should see your side', phase: 'hold' };
  }

  const hipSag   = lHip.y > Math.max(lShoulder.y, lAnkle.y) + 0.06;
  const hipHigh  = lHip.y < Math.min(lShoulder.y, lAnkle.y) - 0.06;

  let formScore = 1.0;
  let feedback  = '✓ Great plank — hold steady!';

  if (hipSag)  { formScore = 0.5; feedback = 'Hips dropping — tighten your core!'; }
  if (hipHigh) { formScore = 0.6; feedback = 'Lower your hips — straight line!'; }

  return { repComplete: false, formScore, feedback, phase: 'hold' };
}

// ─── Exercise dispatcher ─────────────────────────────────────────────────────

function analyzeExercise(exerciseType: string, lms: any[], prevPhase: RepPhase): AnalysisResult {
  switch (exerciseType) {
    case 'squat':        return analyzeSquat(lms, prevPhase);
    case 'pushup':       return analyzePushup(lms, prevPhase);
    case 'lunge':        return analyzeLunge(lms, prevPhase);
    case 'jumping_jack': return analyzeJumpingJack(lms, prevPhase);
    case 'plank':        return analyzePlank(lms);
    case 'cardio':
      return { repComplete: false, formScore: 1.0, feedback: 'Keep moving — cardio in progress!', phase: 'hold' };
    default:
      return { repComplete: false, formScore: 1.0, feedback: 'Tracking...', phase: 'hold' };
  }
}

// ─── Skeleton overlay painter ─────────────────────────────────────────────────

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],
];

function drawSkeleton(ctx: CanvasRenderingContext2D, lms: any[], formScore: number, w: number, h: number) {
  if (!lms.length) return;

  const good  = formScore >= 0.85;
  const color = good ? '#00FF88' : '#FF2E97';
  const glow  = good ? 'rgba(0,255,136,0.5)' : 'rgba(255,46,151,0.5)';

  ctx.shadowBlur = 12;
  ctx.shadowColor = glow;

  // Draw bones
  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  POSE_CONNECTIONS.forEach(([a, b]) => {
    const pa = lms[a], pb = lms[b];
    if (!pa || !pb || pa.visibility < 0.5 || pb.visibility < 0.5) return;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  });

  // Draw joints
  ctx.shadowBlur = 16;
  lms.forEach((lm) => {
    if (!lm || lm.visibility < 0.5) return;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  });

  ctx.shadowBlur = 0;
}

// ─── Main component ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    Pose: any;
  }
}

export default function PoseDetector({ stream, exerciseType, isActive, onStatsUpdate }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef   = useRef<any>(null);
  const statsRef  = useRef({ totalReps: 0, validReps: 0, formScore: 1.0, phase: 'up' as RepPhase, startTime: 0 });
  const activeRef = useRef(isActive);
  const lastRepTime = useRef(0);
  const lastSpokenFeedback = useRef('');
  const lastSpokenTime = useRef(0);
  const lastProgressUpdate = useRef(0);
  const recentFormScores = useRef<number[]>([]);
  const exerciseRef = useRef(exerciseType);
  const [feedback, setFeedback]       = useState('Position yourself in frame');
  const [formScore, setFormScore]     = useState(1.0);
  const [loaded, setLoaded]           = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [repFlash, setRepFlash]       = useState(false);

  // Keep activeRef in sync and initialize start time when it becomes active
  useEffect(() => { 
    if (isActive && !activeRef.current) {
      statsRef.current.startTime = Date.now();
    }
    activeRef.current = isActive; 
  }, [isActive]);

  // Reset stats when exercise type changes
  useEffect(() => {
    if (exerciseRef.current !== exerciseType) {
      exerciseRef.current = exerciseType;
      statsRef.current = { totalReps: 0, validReps: 0, formScore: 1.0, phase: 'up' as RepPhase, startTime: isActive ? Date.now() : 0 };
      lastRepTime.current = 0;
      recentFormScores.current = [];
      onStatsUpdate({
        totalReps: 0, validReps: 0, formAccuracy: 0,
        feedback: 'Position yourself in frame', poseLandmarks: [], isActive: false,
      });
    }
  }, [exerciseType, onStatsUpdate, isActive]);

  // Attach stream to video
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play()
      .then(() => console.log('✅ Video playing'))
      .catch((err) => console.error('❌ Video play error:', err));
  }, [stream]);

  // Load MediaPipe Pose from CDN
  useEffect(() => {
    const scriptId = 'mediapipe-pose';
    if (document.getElementById(scriptId)) {
      initPose();
      return;
    }

    const script = document.createElement('script');
    script.id  = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
    script.crossOrigin = 'anonymous';
    script.onload  = () => initPose();
    script.onerror = () => {
      setLoadError('MediaPipe failed to load. Check internet connection.');
    };
    document.head.appendChild(script);

    return () => {
      poseRef.current?.close?.();
    };
  }, []);

  const initPose = useCallback(() => {
    const PoseClass = (window as any).Pose;
    if (!PoseClass) {
      setTimeout(() => {
        const P2 = (window as any).Pose;
        if (P2) startPose(P2);
        else setLoadError('Pose class not found after load.');
      }, 500);
      return;
    }
    startPose(PoseClass);
  }, []);

  const startPose = useCallback((PoseClass: any) => {
    const pose = new PoseClass({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,  // Lowered for better tracking during movement
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: any) => {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video) return;

      const w = canvas.width  = video.videoWidth  || 640;
      const h = canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;

      // Mirror draw (selfie view)
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const lms = results.poseLandmarks || [];

      // Mirror x coordinates for mirrored display
      const mirroredLms = lms.map((lm: any) => ({ ...lm, x: 1 - lm.x }));

      if (mirroredLms.length && activeRef.current) {
        const analysis = analyzeExercise(exerciseType, mirroredLms, statsRef.current.phase as RepPhase);

        // ── Count reps locally with MediaPipe (instant feedback) ──
        statsRef.current.formScore = analysis.formScore;
        statsRef.current.phase     = analysis.phase;

        const now = Date.now();
        if (analysis.repComplete && (now - lastRepTime.current > 800)) {
          lastRepTime.current = now;
          statsRef.current.totalReps += 1;
          if (analysis.formScore >= 0.85) {
            statsRef.current.validReps += 1;
            setRepFlash(true);
            setTimeout(() => setRepFlash(false), 400);
          }
        }

        // Track recent form scores for Gemini verification
        recentFormScores.current.push(analysis.formScore);
        if (recentFormScores.current.length > 20) {
          recentFormScores.current = recentFormScores.current.slice(-20);
        }

        // Update displayed form score & feedback
        setFormScore(analysis.formScore);
        setFeedback(analysis.feedback);
        
        // Voice Coaching: Speak feedback if form is poor
        if (activeRef.current && analysis.formScore < 0.85 && analysis.feedback !== 'Tracking...') {
          if (analysis.feedback !== lastSpokenFeedback.current || (now - lastSpokenTime.current > 5000)) {
            lastSpokenFeedback.current = analysis.feedback;
            lastSpokenTime.current = now;
            
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(analysis.feedback);
              utterance.rate = 1.1;
              window.speechSynthesis.speak(utterance);
            }
          }
        }

        onStatsUpdate({
          totalReps: statsRef.current.totalReps,
          validReps: statsRef.current.validReps,
          formAccuracy: analysis.formScore,
          feedback: analysis.feedback,
          poseLandmarks: mirroredLms,
          isActive: true,
        });

        // ─── Send lightweight progress to server (every 3 seconds) ───
        // No Gemini Live! Just a simple progress update for end-of-workout verification
        if (now - lastProgressUpdate.current > 3000) {
          lastProgressUpdate.current = now;
          const socket = getSocket();
          if (socket?.connected) {
            const avgScore = recentFormScores.current.length > 0
              ? recentFormScores.current.reduce((a, b) => a + b, 0) / recentFormScores.current.length
              : 1.0;
            const durationSeconds = Math.floor((now - (statsRef.current.startTime || now)) / 1000);
            socket.emit('workout:progress', {
              exerciseType,
              totalReps: statsRef.current.totalReps,
              validReps: statsRef.current.validReps,
              avgFormScore: avgScore,
              durationSeconds,
              recentFormScores: recentFormScores.current.slice(-10),
            });
          }
        }

        drawSkeleton(ctx, mirroredLms, analysis.formScore, w, h);
      } else if (!activeRef.current && mirroredLms.length) {
        // Preview mode — just draw skeleton
        drawSkeleton(ctx, mirroredLms, 1.0, w, h);
        setFeedback('Ready — start workout to count reps');
      }
    });

    poseRef.current = pose;
    setLoaded(true);
    runLoop(pose);
  }, [exerciseType, onStatsUpdate]);

  const runLoop = useCallback(async (pose: any) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      requestAnimationFrame(() => runLoop(pose));
      return;
    }
    try {
      await pose.send({ image: video });
    } catch {}
    requestAnimationFrame(() => runLoop(pose));
  }, []);

  const good = formScore >= 0.85;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 340 }}>
      {/* Hidden source video */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px', opacity: 0, zIndex: -10 }}
      />

      {/* Canvas output */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover rounded-2xl"
        style={{ minHeight: 340 }}
      />

      {/* Loading overlay */}
      {!loaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-space-900/90 rounded-2xl">
          <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
          <p className="text-xs text-space-400 font-mono">Loading AI pose model...</p>
        </div>
      )}

      {/* Error overlay */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-space-900/90 rounded-2xl p-6">
          <AlertCircle className="w-8 h-8 text-neon-pink" />
          <p className="text-xs text-neon-pink text-center font-mono">{loadError}</p>
        </div>
      )}

      {loaded && (
        <>
          {/* LIVE badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 border rounded-lg bg-neon-green/20 border-neon-green/40 text-neon-green">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs font-mono font-bold">AI TRACKING</span>
          </div>

          {/* Form score badge */}
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
            good
              ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
              : 'bg-neon-pink/20 border-neon-pink/40 text-neon-pink'
          }`}>
            {good ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {Math.round(formScore * 100)}%
          </div>

          {/* Rep flash */}
          {repFlash && (
            <div className="absolute inset-0 border-4 border-neon-green rounded-2xl pointer-events-none animate-ping" />
          )}

          {/* Feedback banner */}
          <div className={`absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl text-xs font-semibold text-center transition-colors ${
            good ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30'
          }`}>
            {feedback}
          </div>

          {/* Reference Image Overlay */}
          {['squat', 'pushup', 'lunge', 'jumping_jack', 'plank'].includes(exerciseType) && (
            <div className="absolute right-3 bottom-14 w-24 sm:w-32 rounded-xl overflow-hidden glass border border-space-500/30 shadow-2xl opacity-80 hover:opacity-100 transition-opacity">
              <div className="bg-space-800/80 px-2 py-1 flex items-center justify-between border-b border-space-500/30">
                <span className="text-[9px] sm:text-[10px] font-display font-semibold text-white uppercase tracking-wider">Correct Form</span>
                <Eye className="w-3 h-3 text-neon-cyan" />
              </div>
              <img 
                src={`/exercises/${exerciseType}.png`} 
                alt={`${exerciseType} reference`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          )}
            
          {/* Rep counter — shown when active */}
          {isActive && (
            <div className="absolute left-3 bottom-14 flex flex-col gap-1">
              <div className="glass-sm px-2.5 py-1.5 rounded-lg text-center">
                <p className="text-xs text-space-400 font-mono">Total</p>
                <p className="text-lg font-display font-black text-white">{statsRef.current.totalReps}</p>
              </div>
              <div className="glass-sm px-2.5 py-1.5 rounded-lg text-center border border-neon-green/30">
                <p className="text-xs text-neon-green font-mono">Valid</p>
                <p className="text-lg font-display font-black text-neon-green">{statsRef.current.validReps}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
