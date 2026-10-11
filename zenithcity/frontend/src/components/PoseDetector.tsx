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
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { AIStats } from '../pages/WorkoutPage';
import { getSocket } from '../services/socket';

interface Props {
  stream: MediaStream;
  exerciseType: string;
  isActive: boolean;
  onStatsUpdate: (stats: AIStats) => void;
}

interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  worldX?: number;
  worldY?: number;
  worldZ?: number;
}

const MIN_LANDMARK_VISIBILITY = 0.5;
const PHASE_STABILITY_MS = 120;

function smoothLandmarks(current: Landmark[], previous: Landmark[] | null): Landmark[] {
  if (!previous || previous.length !== current.length) return current;

  const smoothing = 0.45;
  return current.map((landmark, index) => {
    const previousLandmark = previous[index];
    if (!previousLandmark || (landmark.visibility ?? 1) < MIN_LANDMARK_VISIBILITY) {
      return landmark;
    }

    return {
      ...landmark,
      x: previousLandmark.x + (landmark.x - previousLandmark.x) * smoothing,
      y: previousLandmark.y + (landmark.y - previousLandmark.y) * smoothing,
      z: typeof landmark.z === 'number' && typeof previousLandmark.z === 'number'
        ? previousLandmark.z + (landmark.z - previousLandmark.z) * smoothing
        : landmark.z,
      worldX: typeof landmark.worldX === 'number' && typeof previousLandmark.worldX === 'number'
        ? previousLandmark.worldX + (landmark.worldX - previousLandmark.worldX) * smoothing
        : landmark.worldX,
      worldY: typeof landmark.worldY === 'number' && typeof previousLandmark.worldY === 'number'
        ? previousLandmark.worldY + (landmark.worldY - previousLandmark.worldY) * smoothing
        : landmark.worldY,
      worldZ: typeof landmark.worldZ === 'number' && typeof previousLandmark.worldZ === 'number'
        ? previousLandmark.worldZ + (landmark.worldZ - previousLandmark.worldZ) * smoothing
        : landmark.worldZ,
    };
  });
}

function reliableLandmarks(landmarks: Landmark[]): Landmark[] {
  return landmarks.map(landmark => (
    landmark && (landmark.visibility ?? 1) >= MIN_LANDMARK_VISIBILITY ? landmark : null
  )) as Landmark[];
}

// ─── Joint angle helpers ────────────────────────────────────────────────────

function getAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = {
    x: getCoordinate(a, 'x') - getCoordinate(b, 'x'),
    y: getCoordinate(a, 'y') - getCoordinate(b, 'y'),
    z: getCoordinate(a, 'z') - getCoordinate(b, 'z'),
  };
  const cb = {
    x: getCoordinate(c, 'x') - getCoordinate(b, 'x'),
    y: getCoordinate(c, 'y') - getCoordinate(b, 'y'),
    z: getCoordinate(c, 'z') - getCoordinate(b, 'z'),
  };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2 + ab.z ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2 + cb.z ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// MediaPipe landmark indices
const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  NOSE: 0,
};

// ─── Exercise analyzers ──────────────────────────────────────────────────────

type RepPhase = 'up' | 'down' | 'hold' | 'transition';
interface BaseAnalysisResult {
  repComplete: boolean;
  formScore: number;   // 0–1
  feedback: string;
  phase: RepPhase;
}

interface AnalysisResult extends BaseAnalysisResult {
  confidence: number;
  repCompleted: boolean;
}

interface CalibrationProfile {
  squatUpAngle: number;
  squatDownAngle: number;
  pushupUpAngle: number;
  pushupDownAngle: number;
  lungeUpAngle: number;
  lungeDownAngle: number;
}

const DEFAULT_CALIBRATION: CalibrationProfile = {
  squatUpAngle: 160,
  squatDownAngle: 130,
  pushupUpAngle: 155,
  pushupDownAngle: 110,
  lungeUpAngle: 160,
  lungeDownAngle: 120,
};

function getCoordinate(landmark: Landmark, axis: 'x' | 'y' | 'z'): number {
  if (axis === 'x' && typeof landmark.worldX === 'number') return landmark.worldX;
  if (axis === 'y' && typeof landmark.worldY === 'number') return landmark.worldY;
  if (axis === 'z' && typeof landmark.worldZ === 'number') return landmark.worldZ;
  return landmark[axis] ?? 0;
}

function getConfidence(lms: Landmark[], indexes: number[]): number {
  if (indexes.length === 0) return 1;
  const visible = indexes.reduce((sum, index) => sum + (lms[index]?.visibility ?? 0), 0);
  return Math.max(0, Math.min(1, visible / indexes.length));
}

function withConfidence(result: BaseAnalysisResult, lms: Landmark[], indexes: number[]): AnalysisResult {
  return {
    ...result,
    confidence: getConfidence(lms, indexes),
    repCompleted: result.repComplete,
  };
}

function SquatAnalyzer(lms: Landmark[], prevPhase: RepPhase, calibration: CalibrationProfile): BaseAnalysisResult {
  const lHip = lms[LM.LEFT_HIP];
  const lKnee = lms[LM.LEFT_KNEE];
  const lAnkle = lms[LM.LEFT_ANKLE];
  const rHip = lms[LM.RIGHT_HIP];
  const rKnee = lms[LM.RIGHT_KNEE];
  const rAnkle = lms[LM.RIGHT_ANKLE];
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const rShoulder = lms[LM.RIGHT_SHOULDER];

  if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee || !rAnkle) {
    return { repComplete: false, formScore: 0, feedback: 'Step into frame — full body needed', phase: prevPhase };
  }

  const leftKneeAngle = getAngle(lHip, lKnee, lAnkle);
  const rightKneeAngle = getAngle(rHip, rKnee, rAnkle);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // Check knee alignment (shouldn't cave inward)
  const kneeWidth = Math.abs(lKnee.x - rKnee.x);
  const hipWidth = Math.abs(lHip.x - rHip.x);
  const kneesCaved = kneeWidth < hipWidth * 0.6;

  // Check if person is actually standing (not sitting/lying)
  const isStanding = lShoulder && rShoulder &&
    (lShoulder.y < lHip.y - 0.08) && (rShoulder.y < rHip.y - 0.08);

  if (!isStanding) {
    return { repComplete: false, formScore: 0.5, feedback: 'Stand up to perform squats', phase: prevPhase };
  }

  let formScore = 1.0;
  let feedback = '';

  // Phase detection - RELAXED thresholds for real-world movement
  const isDown = avgKneeAngle < calibration.squatDownAngle;
  const isDeep = avgKneeAngle < 100;   // Bonus: deep squat
  const isUp = avgKneeAngle > calibration.squatUpAngle;

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

function PushupAnalyzer(lms: Landmark[], prevPhase: RepPhase, calibration: CalibrationProfile): BaseAnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const lElbow = lms[LM.LEFT_ELBOW];
  const lWrist = lms[LM.LEFT_WRIST];
  const rShoulder = lms[LM.RIGHT_SHOULDER];
  const rElbow = lms[LM.RIGHT_ELBOW];
  const rWrist = lms[LM.RIGHT_WRIST];
  const lHip = lms[LM.LEFT_HIP];
  const rHip = lms[LM.RIGHT_HIP];

  if (!lShoulder || !lElbow || !lWrist || !lHip) {
    return { repComplete: false, formScore: 0, feedback: 'Lie down — camera should see your side profile', phase: prevPhase };
  }

  // Check if person is in plank/pushup position (horizontal body)
  const isHorizontal = lShoulder && lHip && Math.abs(lShoulder.y - lHip.y) < 0.2;

  if (!isHorizontal) {
    return { repComplete: false, formScore: 0.5, feedback: 'Get into pushup position (plank)', phase: prevPhase };
  }

  const leftElbowAngle = getAngle(lShoulder, lElbow, lWrist);
  const rightElbowAngle = rShoulder && rElbow && rWrist ? getAngle(rShoulder, rElbow, rWrist) : leftElbowAngle;
  const avgElbow = (leftElbowAngle + rightElbowAngle) / 2;

  // Body alignment (hip sag)
  const hipSag = lHip && lShoulder ? (lHip.y - lShoulder.y) > 0.15 : false;

  let formScore = 1.0;
  let feedback = '';

  // RELAXED phase detection
  const isDown = avgElbow < calibration.pushupDownAngle;
  const isUp = avgElbow > calibration.pushupUpAngle;

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

function LungeAnalyzer(lms: Landmark[], prevPhase: RepPhase, calibration: CalibrationProfile): BaseAnalysisResult {
  const lHip = lms[LM.LEFT_HIP];
  const lKnee = lms[LM.LEFT_KNEE];
  const lAnkle = lms[LM.LEFT_ANKLE];
  const rHip = lms[LM.RIGHT_HIP];
  const rKnee = lms[LM.RIGHT_KNEE];
  const lShoulder = lms[LM.LEFT_SHOULDER];

  if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee) {
    return { repComplete: false, formScore: 0, feedback: 'Stand sideways — need full body visible', phase: prevPhase };
  }

  const isStanding = lShoulder && lHip && (lShoulder.y < lHip.y - 0.05);

  if (!isStanding) {
    return { repComplete: false, formScore: 0.5, feedback: 'Stand up to perform lunges', phase: prevPhase };
  }

  const leftKneeAngle = getAngle(lHip, lKnee, lAnkle);
  const rightKneeAngle = getAngle(rHip, rKnee, lms[LM.RIGHT_ANKLE] || lAnkle);
  const kneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

  let formScore = 1.0;
  let feedback = '';

  // RELAXED phase detection
  const isDown = kneeAngle < calibration.lungeDownAngle;
  const isUp = kneeAngle > calibration.lungeUpAngle;

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

function JumpingJackAnalyzer(lms: Landmark[], prevPhase: RepPhase): BaseAnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const rShoulder = lms[LM.RIGHT_SHOULDER];
  const lWrist = lms[LM.LEFT_WRIST];
  const rWrist = lms[LM.RIGHT_WRIST];
  const lAnkle = lms[LM.LEFT_ANKLE];
  const rAnkle = lms[LM.RIGHT_ANKLE];

  if (!lShoulder || !rShoulder || !lAnkle || !rAnkle || !lWrist || !rWrist) {
    return { repComplete: false, formScore: 0, feedback: 'Step back — need full body visible', phase: prevPhase };
  }

  // Arms above shoulders
  const armsUp = lWrist.y < lShoulder.y - 0.1 && rWrist.y < rShoulder.y - 0.1;

  // Legs wider than shoulders
  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
  const legWidth = Math.abs(lAnkle.x - rAnkle.x);
  const legsWide = legWidth > shoulderWidth * 1.5;  // Relaxed from 2.0

  // Arms down
  const armsDown = lWrist.y > lShoulder.y && rWrist.y > rShoulder.y;

  // Legs close together
  const legsClosed = legWidth < shoulderWidth * 1.0;  // Relaxed from 0.8

  // OPEN position: arms up, legs wide
  const isOpen = armsUp && legsWide;

  // CLOSED position: arms down, legs together
  const isClosed = armsDown && legsClosed;

  const newPhase: RepPhase = isOpen ? 'up' : isClosed ? 'down' : prevPhase;

  let feedback = '';
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

function PlankAnalyzer(lms: Landmark[]): BaseAnalysisResult {
  const lShoulder = lms[LM.LEFT_SHOULDER];
  const lHip = lms[LM.LEFT_HIP];
  const lAnkle = lms[LM.LEFT_ANKLE];

  if (!lShoulder || !lHip || !lAnkle) {
    return { repComplete: false, formScore: 0, feedback: 'Lie flat — camera should see your side', phase: 'hold' };
  }

  const hipSag = lHip.y > Math.max(lShoulder.y, lAnkle.y) + 0.06;
  const hipHigh = lHip.y < Math.min(lShoulder.y, lAnkle.y) - 0.06;

  let formScore = 1.0;
  let feedback = '✓ Great plank — hold steady!';

  if (hipSag) { formScore = 0.5; feedback = 'Hips dropping — tighten your core!'; }
  if (hipHigh) { formScore = 0.6; feedback = 'Lower your hips — straight line!'; }

  return { repComplete: false, formScore, feedback, phase: 'hold' };
}

// ─── Exercise dispatcher ─────────────────────────────────────────────────────

function analyzeExercise(
  exerciseType: string,
  lms: Landmark[],
  prevPhase: RepPhase,
  calibration: CalibrationProfile,
): AnalysisResult {
  let result: BaseAnalysisResult;
  let requiredLandmarks: number[];

  switch (exerciseType) {
    case 'squat':
      result = SquatAnalyzer(lms, prevPhase, calibration);
      requiredLandmarks = [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE];
      break;
    case 'pushup':
      result = PushupAnalyzer(lms, prevPhase, calibration);
      requiredLandmarks = [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.LEFT_HIP];
      break;
    case 'lunge':
      result = LungeAnalyzer(lms, prevPhase, calibration);
      requiredLandmarks = [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_HIP, LM.RIGHT_KNEE];
      break;
    case 'jumping_jack':
      result = JumpingJackAnalyzer(lms, prevPhase);
      requiredLandmarks = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_ANKLE, LM.RIGHT_ANKLE];
      break;
    case 'plank':
      result = PlankAnalyzer(lms);
      requiredLandmarks = [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE];
      break;
    case 'cardio':
      result = { repComplete: false, formScore: 1.0, feedback: 'Keep moving — cardio in progress!', phase: 'hold' };
      requiredLandmarks = [];
      break;
    default:
      result = { repComplete: false, formScore: 1.0, feedback: 'Tracking...', phase: 'hold' };
      requiredLandmarks = [];
  }

  return withConfidence(result, lms, requiredLandmarks);
}

// ─── Skeleton overlay painter ─────────────────────────────────────────────────

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
];

function drawSkeleton(ctx: CanvasRenderingContext2D, lms: any[], formScore: number, w: number, h: number) {
  if (!lms.length) return;

  const good = formScore >= 0.85;
  const color = good ? '#00FF88' : '#FF2E97';
  const glow = good ? 'rgba(0,255,136,0.5)' : 'rgba(255,46,151,0.5)';

  ctx.shadowBlur = 12;
  ctx.shadowColor = glow;

  // Draw bones
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
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
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.shadowBlur = 0;
}

interface CalibrationState {
  profile: CalibrationProfile;
  squatSamples: number[];
  pushupSamples: number[];
  lungeSamples: number[];
  complete: boolean;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function updateCalibration(state: CalibrationState, lms: Landmark[]): void {
  if (state.complete) return;

  const leftHip = lms[LM.LEFT_HIP];
  const rightHip = lms[LM.RIGHT_HIP];
  const leftKnee = lms[LM.LEFT_KNEE];
  const rightKnee = lms[LM.RIGHT_KNEE];
  const leftAnkle = lms[LM.LEFT_ANKLE];
  const rightAnkle = lms[LM.RIGHT_ANKLE];

  if (leftHip && rightHip && leftKnee && rightKnee && leftAnkle && rightAnkle) {
    const kneeAngle = (
      getAngle(leftHip, leftKnee, leftAnkle) + getAngle(rightHip, rightKnee, rightAnkle)
    ) / 2;
    if (kneeAngle > 145 && state.squatSamples.length < 30) state.squatSamples.push(kneeAngle);
    if (kneeAngle > 145 && state.lungeSamples.length < 30) state.lungeSamples.push(kneeAngle);
  }

  const leftShoulder = lms[LM.LEFT_SHOULDER];
  const leftElbow = lms[LM.LEFT_ELBOW];
  const leftWrist = lms[LM.LEFT_WRIST];
  if (leftShoulder && leftElbow && leftWrist && leftHip && Math.abs(leftShoulder.y - leftHip.y) < 0.2) {
    const elbowAngle = getAngle(leftShoulder, leftElbow, leftWrist);
    if (elbowAngle > 140 && state.pushupSamples.length < 30) state.pushupSamples.push(elbowAngle);
  }

  if (state.squatSamples.length < 10 || state.lungeSamples.length < 10 || state.pushupSamples.length < 10) return;

  const squatUp = average(state.squatSamples);
  const pushupUp = average(state.pushupSamples);
  const lungeUp = average(state.lungeSamples);
  if (squatUp === null || pushupUp === null || lungeUp === null) return;

  state.profile = {
    squatUpAngle: Math.max(150, Math.min(175, squatUp - 2)),
    squatDownAngle: Math.max(110, Math.min(140, squatUp - 32)),
    pushupUpAngle: Math.max(145, Math.min(175, pushupUp - 2)),
    pushupDownAngle: Math.max(90, Math.min(120, pushupUp - 45)),
    lungeUpAngle: Math.max(150, Math.min(175, lungeUp - 2)),
    lungeDownAngle: Math.max(105, Math.min(130, lungeUp - 38)),
  };
  state.complete = true;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PoseDetector({ stream, exerciseType, isActive, onStatsUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const statsRef = useRef({ totalReps: 0, validReps: 0, formScore: 1.0, phase: 'up' as RepPhase, startTime: 0 });
  const activeRef = useRef(isActive);
  const lastRepTime = useRef(0);
  const lastSpokenFeedback = useRef('');
  const lastSpokenTime = useRef(0);
  const lastProgressUpdate = useRef(0);
  const recentFormScores = useRef<number[]>([]);
  const previousLandmarks = useRef<Landmark[] | null>(null);
  const phaseCandidate = useRef<RepPhase>('up');
  const phaseCandidateSince = useRef(0);
  const downStartedAt = useRef(0);
  const calibration = useRef<CalibrationState>({
    profile: DEFAULT_CALIBRATION,
    squatSamples: [],
    pushupSamples: [],
    lungeSamples: [],
    complete: false,
  });
  const exerciseRef = useRef(exerciseType);
  const [feedback, setFeedback] = useState('Position yourself in frame');
  const [formScore, setFormScore] = useState(1.0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [repFlash, setRepFlash] = useState(false);

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
      previousLandmarks.current = null;
      phaseCandidate.current = 'up';
      phaseCandidateSince.current = 0;
      downStartedAt.current = 0;
      calibration.current = {
        profile: DEFAULT_CALIBRATION,
        squatSamples: [],
        pushupSamples: [],
        lungeSamples: [],
        complete: false,
      };
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

  // Load the local MediaPipe Tasks Vision runtime and Pose Landmarker model.
  useEffect(() => {
    let cancelled = false;

    async function loadPoseLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks('/models/wasm');
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }
        startPose(landmarker);
      } catch (error) {
        console.error('Pose Landmarker failed to load:', error);
        setLoadError('MediaPipe pose model failed to load. Check the local model assets.');
      }
    }

    loadPoseLandmarker();

    return () => {
      cancelled = true;
      poseRef.current?.close?.();
    };
  }, []);

  const startPose = useCallback((landmarker: PoseLandmarker) => {
    let resultHandler: ((results: any) => void) | null = null;
    const pose = {
      onResults: (handler: (results: any) => void) => { resultHandler = handler; },
      send: async ({ image }: { image: HTMLVideoElement }) => {
        const result = landmarker.detectForVideo(image, performance.now());
        resultHandler?.({
          poseLandmarks: result.landmarks?.[0] || [],
          poseWorldLandmarks: result.worldLandmarks?.[0] || [],
        });
      },
      close: () => landmarker.close(),
    };

    pose.onResults((results: any) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const w = canvas.width = video.videoWidth || 640;
      const h = canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;

      // Mirror draw (selfie view)
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const lms = results.poseLandmarks || [];
      const worldLms = results.poseWorldLandmarks || [];

      // Mirror x coordinates for mirrored display
      const mirroredLms = lms.map((lm: any, index: number) => ({
        ...lm,
        x: 1 - lm.x,
        worldX: worldLms[index]?.x,
        worldY: worldLms[index]?.y,
        worldZ: worldLms[index]?.z,
      }));
      const smoothedLms = smoothLandmarks(mirroredLms, previousLandmarks.current);
      previousLandmarks.current = smoothedLms;
      const trackedLms = reliableLandmarks(smoothedLms);

      if (smoothedLms.length && activeRef.current) {
        updateCalibration(calibration.current, trackedLms);
        const analysis = analyzeExercise(
          exerciseRef.current,
          trackedLms,
          statsRef.current.phase as RepPhase,
          calibration.current.profile,
        );
        const now = Date.now();

        // Require a phase to remain stable briefly so landmark jitter cannot create reps.
        if (phaseCandidate.current !== analysis.phase) {
          phaseCandidate.current = analysis.phase;
          phaseCandidateSince.current = now;
        }
        const phaseStable = now - phaseCandidateSince.current >= PHASE_STABILITY_MS;
        const stableAnalysis = {
          ...analysis,
          phase: phaseStable ? analysis.phase : statsRef.current.phase,
        };

        // ── Count reps locally with MediaPipe (instant feedback) ──
        statsRef.current.formScore = stableAnalysis.formScore;
        statsRef.current.phase = stableAnalysis.phase;

        if (analysis.repComplete && analysis.confidence >= 0.65 && (now - lastRepTime.current > 800)) {
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
        setFormScore(stableAnalysis.formScore);
        setFeedback(stableAnalysis.feedback);

        // Voice Coaching: Speak feedback if form is poor
        if (activeRef.current && stableAnalysis.formScore < 0.85 && stableAnalysis.feedback !== 'Tracking...') {
          if (stableAnalysis.feedback !== lastSpokenFeedback.current || (now - lastSpokenTime.current > 5000)) {
            lastSpokenFeedback.current = stableAnalysis.feedback;
            lastSpokenTime.current = now;

            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(stableAnalysis.feedback);
              utterance.rate = 1.1;
              window.speechSynthesis.speak(utterance);
            }
          }
        }

        onStatsUpdate({
          totalReps: statsRef.current.totalReps,
          validReps: statsRef.current.validReps,
          formAccuracy: stableAnalysis.formScore,
          feedback: stableAnalysis.feedback,
          poseLandmarks: smoothedLms,
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
              exerciseType: exerciseRef.current,
              totalReps: statsRef.current.totalReps,
              validReps: statsRef.current.validReps,
              avgFormScore: avgScore,
              durationSeconds,
              recentFormScores: recentFormScores.current.slice(-10),
              confidence: analysis.confidence,
            });
          }
        }

        drawSkeleton(ctx, smoothedLms, stableAnalysis.formScore, w, h);
      } else if (!activeRef.current && smoothedLms.length) {
        // Preview mode — just draw skeleton
        drawSkeleton(ctx, smoothedLms, 1.0, w, h);
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
    } catch { }
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
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${good
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
          <div className={`absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl text-xs font-semibold text-center transition-colors ${good ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30'
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
