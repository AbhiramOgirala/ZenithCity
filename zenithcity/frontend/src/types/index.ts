export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  privacyMode: boolean;
  notificationsEnabled: boolean;
  cameraPermission: boolean;
  pointsBalance: number;
  totalPointsEarned: number;
  points_balance?: number;
  privacy_mode?: boolean;
  battle_auto_enroll?: boolean;
  technique_mastery_badge?: boolean;
  fitness_goal?: string;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: string;
  health_issues?: string;
  target_weight_kg?: number;
  time_period_weeks?: number;
  time_per_day_minutes?: number;
  onboarding_completed?: boolean;
  current_streak?: number;
  best_streak?: number;
  last_workout_date?: string;
}

export interface City {
  id: string;
  userId: string;
  territorySize: number;
  healthStatus: number;
  createdAt: string;
  lastActivityDate: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  cityId: string;
  buildingType: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  status: BuildingStatus;
  health: number;
  constructionStartTime: string;
  constructionEndTime: string;
}

export type BuildingType = 'house' | 'apartment' | 'office' | 'park' | 'stadium' | 'skyscraper';
export type BuildingStatus = 'under_construction' | 'completed' | 'damaged';

export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseType: ExerciseType;
  startTime: string;
  endTime: string | null;
  duration: number;
  validReps: number;
  totalReps: number;
  pointsEarned: number;
  verificationStatus: VerificationStatus;
}

export type ExerciseType = 'squat' | 'pushup' | 'lunge' | 'plank' | 'jumping_jack' | 'cardio' | 'running' | 'walking';
export type VerificationStatus = 'pending' | 'verified' | 'manual' | 'rejected';

export interface TerritoryBattle {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed';
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  rank: number;
}

export interface WeeklyPoints {
  weekStart: string;
  totalPoints: number;
  workoutCount: number;
}

export interface DashboardData {
  user: User;
  city: City;
  recentWorkouts: WorkoutSession[];
  weeklyPoints: WeeklyPoints[];
  leaderboardRank: LeaderboardEntry | null;
  upcomingBattles: TerritoryBattle[];
  workoutCount30Days: number;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: string;
  referenceId: string | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface WorkoutState {
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  isLoading: boolean;
  currentReps: number;
  currentPoints: number;
  formFeedback: string[];
}

export interface CityState {
  city: City | null;
  isLoading: boolean;
  error: string | null;
}

export const BUILDING_INFO: Record<BuildingType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  baseCost: number;
}> = {
  house: {
    name: 'House',
    description: 'A cozy starter home for your city',
    icon: '🏠',
    color: '#00FF88',
    baseCost: 100,
  },
  apartment: {
    name: 'Apartment',
    description: 'Multi-family residential building',
    icon: '🏢',
    color: '#00F5FF',
    baseCost: 500,
  },
  office: {
    name: 'Office Tower',
    description: 'Business hub for your city',
    icon: '🏙️',
    color: '#6B7FD7',
    baseCost: 1000,
  },
  park: {
    name: 'City Park',
    description: 'Green space for healthy living',
    icon: '🌳',
    color: '#00FF88',
    baseCost: 300,
  },
  stadium: {
    name: 'Stadium',
    description: 'Epic sports arena and events venue',
    icon: '🏟️',
    color: '#FFD93D',
    baseCost: 5000,
  },
  skyscraper: {
    name: 'Skyscraper',
    description: 'Iconic tower dominating the skyline',
    icon: '🌆',
    color: '#B24BF3',
    baseCost: 3000,
  },
};

export const EXERCISE_INFO: Record<ExerciseType, {
  name: string;
  icon: string;
  description: string;
  pointsDesc: string;
  type: 'strength' | 'cardio' | 'gps';
}> = {
  squat: {
    name: 'Squat',
    icon: '🏋️',
    description: 'Lower body strength training',
    pointsDesc: '2 pts per valid rep',
    type: 'strength',
  },
  pushup: {
    name: 'Push-Up',
    icon: '💪',
    description: 'Upper body push exercise',
    pointsDesc: '2 pts per valid rep',
    type: 'strength',
  },
  lunge: {
    name: 'Lunge',
    icon: '🦵',
    description: 'Unilateral leg strengthening',
    pointsDesc: '2 pts per valid rep',
    type: 'strength',
  },
  plank: {
    name: 'Plank',
    icon: '🧘',
    description: 'Core stability and endurance',
    pointsDesc: '10 pts per minute',
    type: 'cardio',
  },
  jumping_jack: {
    name: 'Jumping Jacks',
    icon: '⭐',
    description: 'Full body cardio exercise',
    pointsDesc: '2 pts per valid rep',
    type: 'strength',
  },
  cardio: {
    name: 'Cardio',
    icon: '❤️',
    description: 'General cardiovascular training',
    pointsDesc: '10 pts per minute',
    type: 'cardio',
  },
  running: {
    name: 'Running',
    icon: '🏃',
    description: 'Outdoor GPS-tracked run',
    pointsDesc: '10 pts/min + 50 pts/km',
    type: 'gps',
  },
  walking: {
    name: 'Walking',
    icon: '🚶',
    description: 'GPS-tracked walk for territory',
    pointsDesc: '10 pts/min + 50 pts/km',
    type: 'gps',
  },
};
