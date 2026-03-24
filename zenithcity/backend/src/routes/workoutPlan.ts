import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Hardcoded plan templates keyed by goal + level
// This avoids needing Gemini/AI and works offline
const PLAN_TEMPLATES: Record<string, Record<string, any>> = {
  'weight_loss': {
    beginner: { days: 3, exercises: ['jumping_jack', 'squat', 'lunge'] },
    intermediate: { days: 4, exercises: ['jumping_jack', 'squat', 'lunge', 'pushup'] },
    advanced: { days: 5, exercises: ['jumping_jack', 'squat', 'lunge', 'pushup', 'plank'] },
  },
  'muscle_gain': {
    beginner: { days: 3, exercises: ['pushup', 'squat', 'lunge'] },
    intermediate: { days: 4, exercises: ['pushup', 'squat', 'lunge', 'plank'] },
    advanced: { days: 5, exercises: ['pushup', 'squat', 'lunge', 'plank', 'jumping_jack'] },
  },
  'endurance': {
    beginner: { days: 3, exercises: ['cardio', 'jumping_jack', 'plank'] },
    intermediate: { days: 4, exercises: ['cardio', 'jumping_jack', 'plank', 'squat'] },
    advanced: { days: 5, exercises: ['cardio', 'jumping_jack', 'plank', 'squat', 'lunge'] },
  },
  'general_fitness': {
    beginner: { days: 3, exercises: ['squat', 'pushup', 'plank'] },
    intermediate: { days: 4, exercises: ['squat', 'pushup', 'plank', 'jumping_jack'] },
    advanced: { days: 5, exercises: ['squat', 'pushup', 'plank', 'jumping_jack', 'lunge'] },
  },
};

const EXERCISE_META: Record<string, { name: string; sets: number; reps: number; duration_seconds?: number; rest_seconds: number; notes: string }> = {
  squat:        { name: 'Squats',        sets: 3, reps: 15, rest_seconds: 60,  notes: 'Keep knees behind toes, chest up' },
  pushup:       { name: 'Push-Ups',      sets: 3, reps: 12, rest_seconds: 60,  notes: 'Full range of motion, core tight' },
  lunge:        { name: 'Lunges',        sets: 3, reps: 12, rest_seconds: 60,  notes: 'Alternate legs, keep torso upright' },
  plank:        { name: 'Plank Hold',    sets: 3, reps: 1,  duration_seconds: 45, rest_seconds: 45, notes: 'Straight line from head to heels' },
  jumping_jack: { name: 'Jumping Jacks', sets: 3, reps: 30, rest_seconds: 30,  notes: 'Full arm extension overhead' },
  cardio:       { name: 'Cardio Burst',  sets: 1, reps: 1,  duration_seconds: 300, rest_seconds: 60, notes: 'Maintain elevated heart rate' },
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FOCUS_LABELS: Record<string, string> = {
  squat: 'Lower Body', pushup: 'Upper Body', lunge: 'Legs & Glutes',
  plank: 'Core', jumping_jack: 'Cardio', cardio: 'Cardio Endurance',
};

function buildPlan(goal: string, level: string, fitnessLevel: string) {
  const normalizedGoal = goal?.toLowerCase().replace(/\s+/g, '_') || 'general_fitness';
  const normalizedLevel = fitnessLevel?.toLowerCase() || level?.toLowerCase() || 'beginner';

  const template = PLAN_TEMPLATES[normalizedGoal]?.[normalizedLevel]
    || PLAN_TEMPLATES['general_fitness']['beginner'];

  const { days, exercises } = template;
  const workDays = DAYS_OF_WEEK.slice(0, days);

  const plan = workDays.map((day, i) => {
    const primaryEx = exercises[i % exercises.length];
    const secondaryEx = exercises[(i + 1) % exercises.length];
    return {
      day,
      focus: FOCUS_LABELS[primaryEx] || 'Full Body',
      exercises: [
        { type: primaryEx, ...EXERCISE_META[primaryEx] },
        { type: secondaryEx, ...EXERCISE_META[secondaryEx] },
      ],
    };
  });

  // Add rest days
  DAYS_OF_WEEK.slice(days).forEach(day => {
    plan.push({ day, focus: 'Rest & Recovery', exercises: [] });
  });

  return {
    goal: normalizedGoal.replace(/_/g, ' '),
    level: normalizedLevel,
    days_per_week: days,
    plan,
    tips: [
      'Warm up for 5 minutes before each session',
      'Stay hydrated — drink water before, during, and after',
      'Sleep 7-9 hours for optimal recovery',
      'Track your reps with the AI camera to earn city points',
    ],
  };
}

// GET /api/workout-plan
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('fitness_goal, fitness_level, age, weight_kg, height_cm')
      .eq('id', req.user!.id)
      .single();

    const goal = user?.fitness_goal || 'general_fitness';
    const level = user?.fitness_level || 'beginner';

    const plan = buildPlan(goal, level, level);
    res.json(plan);
  } catch (err) {
    console.error('Workout plan error:', err);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

export default router;
