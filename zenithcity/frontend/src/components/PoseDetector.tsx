/**
 * PoseDetector — Real AI pose detection using MediaPipe via CDN
 * 
 * Uses @mediapipe/pose loaded from CDN (no npm install needed).
 * Performs real joint-angle analysis for each exercise type.
 * Only counts reps when form accuracy >= 85%.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Activity, Zap, Eye, BrainCircuit } from 'lucide-react';
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
  const kneesCaved = kneeWidth < hipWidth * 0.7;

  // Check if person is actually standing (not sitting/lying)
  const isStanding = lShoulder && rShoulder && 
    (lShoulder.y < lHip.y - 0.1) && (rShoulder.y < rHip.y - 0.1);

  if (!isStanding) {
    return { repComplete: false, formScore: 0, feedback: 'Stand up to perform squats', phase: prevPhase };
  }

  let formScore = 1.0;
  let feedback  = '';

  // Phase detection - STRICT thresholds
  const isDeepDown = avgKneeAngle < 100;  // Must go below 100° to count as down
  const isFullyUp  = avgKneeAngle > 165;  // Must extend above 165° to count as up
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDeepDown) {
    newPhase = 'down';
  } else if (isFullyUp) {
    newPhase = 'up';
  }

  // Form scoring
  if (isDeepDown) {
    if (avgKneeAngle > 90) { formScore -= 0.2; feedback = 'Go deeper — knees to 90°'; }
    if (kneesCaved) { formScore -= 0.3; feedback = 'Knees caving — push them out'; }
    if (!feedback) feedback = '✓ Good depth!';
  } else if (isFullyUp) {
    if (kneesCaved) { formScore -= 0.25; feedback = 'Drive knees outward'; }
    if (!feedback) feedback = 'Stand tall — ready for next rep';
  } else {
    // In between - not a valid position
    formScore = 0.5;
    feedback = avgKneeAngle < 140 ? 'Go all the way down!' : 'Stand fully upright!';
  }

  // Only count rep if form score is good AND we completed full range
  const repComplete = prevPhase === 'down' && isFullyUp && formScore >= 0.85;
  
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
  const isHorizontal = lShoulder && lHip && Math.abs(lShoulder.y - lHip.y) < 0.15;
  
  if (!isHorizontal) {
    return { repComplete: false, formScore: 0, feedback: 'Get into pushup position (plank)', phase: prevPhase };
  }

  const leftElbowAngle  = getAngle(lShoulder, lElbow, lWrist);
  const rightElbowAngle = rShoulder && rElbow && rWrist ? getAngle(rShoulder, rElbow, rWrist) : leftElbowAngle;
  const avgElbow        = (leftElbowAngle + rightElbowAngle) / 2;

  // Body alignment (hip sag)
  const hipSag = lHip && lShoulder ? (lHip.y - lShoulder.y) > 0.15 : false;

  let formScore = 1.0;
  let feedback  = '';

  // STRICT phase detection
  const isDeepDown = avgElbow < 90;   // Must bend elbows below 90°
  const isFullyUp  = avgElbow > 160;  // Must extend arms above 160°
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDeepDown) {
    newPhase = 'down';
  } else if (isFullyUp) {
    newPhase = 'up';
  }

  if (isDeepDown) {
    if (avgElbow > 80) { formScore -= 0.15; feedback = 'Lower chest closer to ground'; }
    if (hipSag)        { formScore -= 0.3;  feedback = 'Hips sagging — engage core!'; }
    if (!feedback) feedback = '✓ Great depth!';
  } else if (isFullyUp) {
    if (hipSag) { formScore -= 0.2; feedback = 'Keep core tight'; }
    if (!feedback) feedback = 'Arms extended — next rep!';
  } else {
    formScore = 0.5;
    feedback = avgElbow < 130 ? 'Push all the way up!' : 'Lower down fully!';
  }

  // Only count if form is good and full range completed
  const repComplete = prevPhase === 'down' && isFullyUp && formScore >= 0.85;
  
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

  // Check if person is standing (not sitting)
  const isStanding = lShoulder && lHip && (lShoulder.y < lHip.y - 0.05);
  
  if (!isStanding) {
    return { repComplete: false, formScore: 0, feedback: 'Stand up to perform lunges', phase: prevPhase };
  }

  // Use front leg (the one more bent)
  const leftKneeAngle  = getAngle(lHip, lKnee, lAnkle);
  const rightKneeAngle = getAngle(rHip, rKnee, lms[LM.RIGHT_ANKLE] || lAnkle);
  const kneeAngle = Math.min(leftKneeAngle, rightKneeAngle); // Use the more bent knee

  let formScore = 1.0;
  let feedback  = '';

  // STRICT phase detection
  const isDeepDown = kneeAngle < 100;  // Must go below 100°
  const isFullyUp  = kneeAngle > 165;  // Must stand fully upright
  
  let newPhase: RepPhase = prevPhase;
  
  if (isDeepDown) {
    newPhase = 'down';
  } else if (isFullyUp) {
    newPhase = 'up';
  }

  if (isDeepDown) {
    if (kneeAngle > 90) { formScore -= 0.2; feedback = 'Lower your back knee closer to the floor'; }
    // Check knee over toe (knee shouldn't pass ankle)
    if (lKnee.x > lAnkle.x + 0.05) { formScore -= 0.25; feedback = 'Front knee behind toes!'; }
    if (!feedback) feedback = '✓ Good lunge depth!';
  } else if (isFullyUp) {
    feedback = 'Extend fully between reps';
  } else {
    formScore = 0.5;
    feedback = kneeAngle < 140 ? 'Go deeper!' : 'Stand fully upright!';
  }

  // Only count if form is good and full range completed
  const repComplete = prevPhase === 'down' && isFullyUp && formScore >= 0.85;
  
  return { repComplete, formScore: Math.max(0, formScore), feedback, phase: newPhase };
}

function analyzeJumpingJack(lms: any[], prevPhase: RepPhase): AnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const rShoulder = lms[LM.RIGHT_SHOULDER];
  const lWrist    = lms[LM.LEFT_WRIST];
  const rWrist    = lms[LM.RIGHT_WRIST];
  const lAnkle    = lms[LM.LEFT_ANKLE];
  const rAnkle    = lms[LM.RIGHT_ANKLE];
  const lElbow    = lms[LM.LEFT_ELBOW];
  const rElbow    = lms[LM.RIGHT_ELBOW];

  if (!lShoulder || !rShoulder || !lAnkle || !rAnkle || !lWrist || !rWrist) {
    return { repComplete: false, formScore: 0, feedback: 'Step back — need full body visible', phase: prevPhase };
  }

  // Arms must be ABOVE shoulders (not just slightly raised)
  const leftArmUp  = lWrist.y < lShoulder.y - 0.15;
  const rightArmUp = rWrist.y < rShoulder.y - 0.15;
  const armsUp     = leftArmUp && rightArmUp;

  // Arms must be WIDE (not just up, but spread out)
  const armsWide = lWrist && rWrist && Math.abs(lWrist.x - rWrist.x) > 0.4;

  // Legs must be SIGNIFICANTLY wider than shoulder width
  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
  const legWidth      = Math.abs(lAnkle.x - rAnkle.x);
  const legsWide      = legWidth > shoulderWidth * 2.0; // Must be 2x shoulder width

  // Arms must be DOWN (below shoulders)
  const leftArmDown  = lWrist.y > lShoulder.y + 0.05;
  const rightArmDown = rWrist.y > rShoulder.y + 0.05;
  const armsDown     = leftArmDown && rightArmDown;

  // Legs must be CLOSE together (feet nearly touching)
  const legsClosed = legWidth < shoulderWidth * 0.8;

  // OPEN position: arms up AND wide, legs wide
  const isOpen = armsUp && armsWide && legsWide;
  
  // CLOSED position: arms down, legs together
  const isClosed = armsDown && legsClosed;

  const newPhase: RepPhase = isOpen ? 'up' : isClosed ? 'down' : prevPhase;

  let feedback  = '';
  let formScore = 0.0;

  if (isOpen) {
    feedback = '✓ Full star position!';
    formScore = 1.0;
  } else if (isClosed) {
    feedback = 'Jump and spread arms & legs!';
    formScore = 1.0;
  } else {
    // Partial movement - give specific feedback
    if (!armsUp && !armsDown) {
      feedback = 'Raise arms all the way up!';
      formScore = 0.3;
    } else if (!armsWide && armsUp) {
      feedback = 'Spread arms wider!';
      formScore = 0.5;
    } else if (!legsWide && !legsClosed) {
      feedback = 'Jump higher — spread legs wider!';
      formScore = 0.4;
    } else {
      feedback = 'Complete the full jumping jack motion';
      formScore = 0.2;
    }
  }

  // Only count rep if we went from FULLY OPEN to FULLY CLOSED
  const repComplete = prevPhase === 'up' && isClosed && formScore >= 0.85;
  
  return { repComplete, formScore, feedback, phase: newPhase };
}

function analyzePlank(lms: any[]): AnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const lHip      = lms[LM.LEFT_HIP];
  const lAnkle    = lms[LM.LEFT_ANKLE];

  if (!lShoulder || !lHip || !lAnkle) {
    return { repComplete: false, formScore: 0, feedback: 'Lie flat — camera should see your side', phase: 'hold' };
  }

  // Body should be nearly horizontal
  const bodyLineAngle = Math.abs(
    Math.atan2(lAnkle.y - lShoulder.y, lAnkle.x - lShoulder.x) * (180 / Math.PI)
  );

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
  const statsRef  = useRef({ totalReps: 0, validReps: 0, formScore: 1.0, phase: 'up' as RepPhase });
  const activeRef = useRef(isActive);
  const lastGeminiUpdate = useRef(0);
  const geminiScoreRef = useRef(1.0);
  const [feedback, setFeedback]       = useState('Position yourself in frame');
  const [formScore, setFormScore]     = useState(1.0);
  const [loaded, setLoaded]           = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [repFlash, setRepFlash]       = useState(false);
  const [isGeminiActive, setIsGeminiActive] = useState(false);

  // Keep activeRef in sync
  useEffect(() => { activeRef.current = isActive; }, [isActive]);

  // Setup Gemini Socket listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    // Listen for Gemini AI streaming analysis
    socket.on('workout:analysis', (data: any) => {
      setIsGeminiActive(true);
      if (!activeRef.current) return;

      // Gemini is the source of truth for rep form checks
      if (data.rep_completed_this_frame) {
        // Increment total reps natively in the browser only when AI says a rep finished
        statsRef.current.totalReps += 1;
        
        // Count valid only if form is good OR gemini says it is valid
        if (data.is_valid_form || data.form_score >= 0.85) {
            statsRef.current.validReps += 1;
            setRepFlash(true);
            setTimeout(() => setRepFlash(false), 400);
        }
      }

      // We preserve the phase provided by Gemini
      statsRef.current.phase = data.current_phase || statsRef.current.phase;
      
      geminiScoreRef.current = data.form_score ?? 1.0;
      setFormScore(geminiScoreRef.current);
      setFeedback(`[AI Coach]: ${data.feedback}`);
      
      onStatsUpdate({
        totalReps: statsRef.current.totalReps,
        validReps: statsRef.current.validReps,
        formAccuracy: geminiScoreRef.current,
        feedback: data.feedback,
        poseLandmarks: [], // Handled by mediapipe
        isActive: true,
      });
    });

    return () => {
      socket.off('workout:analysis');
      socket.emit('workout:end');
    };
  }, [onStatsUpdate]);

  // Attach stream to video
  useEffect(() => {
    if (!videoRef.current) return;
    console.log('📹 Attaching stream to video element');
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
    // Try accessing Pose from window (CDN loads it globally)
    const PoseClass = (window as any).Pose;
    if (!PoseClass) {
      // Retry after short delay
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
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
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

        // We only use MediaPipe for instant visual feedback on phase/form score.
        // We NO LONGER increment reps locally. We trust Gemini for that.
        
        // Only update local form score if Gemini hasn't taken over recently
        if (!isGeminiActive) {
          statsRef.current.formScore = analysis.formScore;
          statsRef.current.phase     = analysis.phase;
          setFormScore(analysis.formScore);
          setFeedback(analysis.feedback);
          
          onStatsUpdate({
            totalReps: statsRef.current.totalReps,
            validReps: statsRef.current.validReps,
            formAccuracy: analysis.formScore,
            feedback: analysis.feedback,
            poseLandmarks: mirroredLms,
            isActive: true,
          });
        } else {
          // If Gemini is active, we just do a silent update of landmarks
          onStatsUpdate({
            totalReps: statsRef.current.totalReps,
            validReps: statsRef.current.validReps,
            formAccuracy: geminiScoreRef.current, // Use Gemini's score
            feedback: feedback, // Keep Gemini's feedback
            poseLandmarks: mirroredLms,
            isActive: true,
          });
        }

        // ─── Gemini Live Stream (Hybrid Mode) ───
        // Only capture & send frame to Gemini every 400ms if active
        const now = Date.now();
        if (activeRef.current && (now - lastGeminiUpdate.current > 400)) {
          lastGeminiUpdate.current = now;
          const socket = getSocket();
          if (socket?.connected && video) {
            // Compress heavily for speed ~25kb per frame
            const frameSrc = canvas.toDataURL('image/jpeg', 0.5);
            const base64Data = frameSrc.replace(/^data:image\/jpeg;base64,/, '');
            socket.emit('workout:frame', { frame: base64Data, exerciseType });
          }
        }

        drawSkeleton(ctx, mirroredLms, isGeminiActive ? geminiScoreRef.current : analysis.formScore, w, h);
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
      {/* Hidden source video (visible for debugging) */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '75px', zIndex: 1000, border: '2px solid red' }}
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
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 border rounded-lg ${
            isGeminiActive ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan' : 'bg-neon-pink/20 border-neon-pink/40 text-neon-pink'
          }`}>
            {isGeminiActive ? <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />}
            <span className="text-xs font-mono font-bold">{isGeminiActive ? 'GEMINI LIVE' : 'LIVE AI'}</span>
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
