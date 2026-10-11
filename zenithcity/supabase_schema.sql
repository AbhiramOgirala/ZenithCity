-- ZenithCity Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  privacy_mode BOOLEAN DEFAULT FALSE,
  battle_auto_enroll BOOLEAN DEFAULT TRUE,
  consecutive_correct_sessions INTEGER DEFAULT 0,
  technique_mastery_badge BOOLEAN DEFAULT FALSE,
  points_balance INTEGER DEFAULT 0,
  fitness_goal VARCHAR(20),
  height_cm FLOAT,
  weight_kg FLOAT,
  age INTEGER,
  gender VARCHAR(20),
  health_issues TEXT,
  target_weight_kg FLOAT,
  time_period_weeks INTEGER,
  time_per_day_minutes INTEGER,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_workout_date VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  territory_size INTEGER DEFAULT 100,
  health INTEGER DEFAULT 100,
  last_workout_at TIMESTAMPTZ,
  decline_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  level INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'under_construction',
  health INTEGER DEFAULT 100,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  position_z FLOAT DEFAULT 0,
  construction_started_at TIMESTAMPTZ DEFAULT NOW(),
  construction_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_reps INTEGER DEFAULT 0,
  valid_reps INTEGER DEFAULT 0,
  form_accuracy FLOAT DEFAULT 0,
  verification_status VARCHAR(50) DEFAULT 'pending',
  points_earned INTEGER DEFAULT 0,
  gps_distance_km FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  total_distance_km FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_coordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES gps_routes(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  altitude FLOAT DEFAULT 0,
  accuracy FLOAT DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territory_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES territory_battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  battle_points INTEGER DEFAULT 0,
  rank INTEGER,
  territory_reward INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(battle_id, user_id)
);

CREATE TABLE IF NOT EXISTS form_feedback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50),
  feedback_message TEXT NOT NULL,
  rep_number INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_buildings_city_id ON buildings(city_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_user_id ON battle_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_form_feedback_workout ON form_feedback_history(workout_session_id);

-- Add columns used by workout plans, onboarding, and Strava sync.
-- These statements are safe to run against an existing database.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS battle_auto_enroll BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consecutive_correct_sessions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS technique_mastery_badge BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fitness_goal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS height_cm FLOAT,
  ADD COLUMN IF NOT EXISTS weight_kg FLOAT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS health_issues TEXT,
  ADD COLUMN IF NOT EXISTS target_weight_kg FLOAT,
  ADD COLUMN IF NOT EXISTS time_period_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS time_per_day_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_workout_date VARCHAR(10),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(20) DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS current_plan_json JSONB,
  ADD COLUMN IF NOT EXISTS diet_preference VARCHAR(50),
  ADD COLUMN IF NOT EXISTS watch_access_token TEXT,
  ADD COLUMN IF NOT EXISTS watch_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS watch_connected BOOLEAN DEFAULT FALSE;

-- Refresh PostgREST's schema cache after applying migrations.
NOTIFY pgrst, 'reload schema';

-- Atomically award externally synced activity points.
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users
  SET points_balance = COALESCE(points_balance, 0) + amount,
      updated_at = NOW()
  WHERE users.id = $1
  RETURNING points_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- Restore each building in a city by 10 points, capped at 100.
CREATE OR REPLACE FUNCTION restore_building_health(p_city_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE buildings
  SET health = LEAST(100, COALESCE(health, 0) + 10)
  WHERE city_id = p_city_id;
$$;
