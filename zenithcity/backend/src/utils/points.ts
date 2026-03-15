import { ExerciseType, VerificationStatus, PointsCalculationInput } from '../types';


// Points calculation formulas per requirements
export function calculateWorkoutPoints(input: PointsCalculationInput): number {
  const { exercise_type, duration_seconds, valid_reps, gps_distance_km, verification_status } = input;

  let points = 0;
  const durationMinutes = duration_seconds / 60;

  // Cardio: 10 pts/min
  const cardioTypes: ExerciseType[] = ['cardio', 'plank', 'jumping_jack'];
  if (cardioTypes.includes(exercise_type)) {
    points += Math.floor(durationMinutes * 10);
  }

  // Strength: 2 pts/valid rep
  const strengthTypes: ExerciseType[] = ['squat', 'pushup', 'lunge'];
  if (strengthTypes.includes(exercise_type)) {
    points += valid_reps * 2;
  }

  // GPS: 50 pts/km (for running/walking)
  const gpsTypes: ExerciseType[] = ['running', 'walking'];
  if (gpsTypes.includes(exercise_type) && gps_distance_km > 0) {
    points += Math.floor(gps_distance_km * 50);
  }

  // POLICY: Manual workout (no camera) earns 0 points for strength/cardio.
  // Only GPS-based exercises (running, walking) earn points without camera
  // because GPS is independently verifiable.
  if (verification_status === 'manual') {
    const gpsOnly: ExerciseType[] = ['running', 'walking'];
    if (!gpsOnly.includes(exercise_type)) {
      return 0; // No camera = no points for strength/cardio
    }
    // GPS exercises still earn distance points even in manual mode
  }

  return Math.max(0, points);
}

// Haversine formula for GPS distance
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateRouteDistance(coords: Array<{ latitude: number; longitude: number }>): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(
      coords[i - 1].latitude, coords[i - 1].longitude,
      coords[i].latitude, coords[i].longitude
    );
  }
  return total;
}

// Building costs
export const BUILDING_COSTS: Record<string, { base_cost: number; upgrade_multiplier: number }> = {
  house: { base_cost: 100, upgrade_multiplier: 1.5 },
  apartment: { base_cost: 500, upgrade_multiplier: 1.5 },
  office: { base_cost: 1000, upgrade_multiplier: 1.5 },
  park: { base_cost: 300, upgrade_multiplier: 1.5 },
  stadium: { base_cost: 5000, upgrade_multiplier: 1.5 },
};

export const MAX_TERRITORY_SIZE = 10000;
export const MAX_BUILDING_LEVEL = 3;
export const DECLINE_INACTIVITY_DAYS = 7;
export const DECLINE_HEALTH_REDUCTION_PER_DAY = 5;
export const WORKOUT_HEALTH_RESTORE = 10;
export const MIN_WORKOUT_DURATION = 30;
