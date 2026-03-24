// Core domain types for ZenithCity

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  privacy_mode: boolean;
  battle_auto_enroll: boolean;
  consecutive_correct_sessions: number;
  technique_mastery_badge: boolean;
  fitness_goal: 'weight_loss' | 'strength' | 'endurance' | null;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  gender: string | null;
  health_issues: string | null;
  onboarding_completed: boolean;
  current_streak: number;
  best_streak: number;
  last_workout_date: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface City {
  id: string;
  user_id: string;
  name: string;
  territory_size: number;
  health: number;
  last_workout_at: Date | null;
  decline_active: boolean;
  created_at: Date;
}

export type BuildingType = 'house' | 'apartment' | 'office' | 'park' | 'stadium';
export type BuildingStatus = 'under_construction' | 'completed' | 'damaged';

export interface Building {
  id: string;
  city_id: string;
  type: BuildingType;
  level: number;
  status: BuildingStatus;
  health: number;
  position_x: number;
  position_y: number;
  position_z: number;
  construction_started_at: Date;
  construction_completed_at: Date;
  created_at: Date;
}

export type ExerciseType = 'squat' | 'pushup' | 'lunge' | 'plank' | 'jumping_jack' | 'cardio' | 'running' | 'walking';
export type VerificationStatus = 'ai_verified' | 'manual' | 'pending';

export interface WorkoutSession {
  id: string;
  user_id: string;
  exercise_type: ExerciseType;
  started_at: Date;
  completed_at: Date | null;
  duration_seconds: number | null;
  total_reps: number;
  valid_reps: number;
  form_accuracy: number;
  verification_status: VerificationStatus;
  points_earned: number;
  gps_distance_km: number;
  created_at: Date;
}

export interface GPSRoute {
  id: string;
  workout_session_id: string;
  total_distance_km: number;
  created_at: Date;
}

export interface GPSCoordinate {
  id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'award' | 'deduct';
  reference_type: string;
  reference_id: string;
  balance_after: number;
  created_at: Date;
}

export interface TerritoryBattle {
  id: string;
  name: string;
  starts_at: Date;
  ends_at: Date;
  status: 'scheduled' | 'active' | 'completed';
  created_at: Date;
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  battle_points: number;
  rank: number | null;
  territory_reward: number;
  joined_at: Date;
}

export interface FormFeedback {
  id: string;
  workout_session_id: string;
  user_id: string;
  exercise_type: ExerciseType;
  feedback_message: string;
  rep_number: number;
  timestamp: Date;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_points: number;
  display_name: string;
}

export interface DashboardData {
  workouts_last_30_days: number;
  weekly_points: { week: string; points: number }[];
  city_state: City & { buildings: Building[] };
  leaderboard_rank: number;
  points_balance: number;
  points_to_next_rank: number;
  upcoming_battles: TerritoryBattle[];
}

// Request/Response types
export interface AuthRequest {
  user: { id: string; email: string };
}

export interface PointsCalculationInput {
  exercise_type: ExerciseType;
  duration_seconds: number;
  valid_reps: number;
  gps_distance_km: number;
  verification_status: VerificationStatus;
}

export interface WorkoutPlanDay {
  day: string;
  exercises: {
    type: ExerciseType;
    name: string;
    sets: number;
    reps: number;
    duration_seconds?: number;
    rest_seconds: number;
    notes: string;
  }[];
  focus: string;
}

export interface WorkoutPlan {
  goal: string;
  level: string;
  days_per_week: number;
  plan: WorkoutPlanDay[];
  tips: string[];
}
