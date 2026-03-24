import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/database';
import { WorkoutPlan, WorkoutPlanDay } from '../types';

const router = Router();

/**
 * Rule-based workout plan generator.
 * Creates a personalized plan based on user's fitness goal, age, and weight.
 */
function generateWorkoutPlan(
  goal: string,
  age: number | null,
  weight_kg: number | null,
  height_cm: number | null
): WorkoutPlan {
  const userAge = age || 25;
  const isYoung = userAge < 30;
  const isSenior = userAge > 50;

  // Determine intensity level
  let level = 'intermediate';
  if (isSenior) level = 'beginner';
  else if (isYoung) level = 'advanced';

  switch (goal) {
    case 'weight_loss':
      return {
        goal: 'Weight Loss',
        level,
        days_per_week: isSenior ? 3 : 5,
        plan: getWeightLossPlan(level),
        tips: [
          'Focus on keeping heart rate elevated between exercises',
          'Stay hydrated — drink water between sets',
          'Combine this plan with a caloric deficit diet for best results',
          'Aim for 7-8 hours of sleep each night to support recovery',
        ],
      };

    case 'strength':
      return {
        goal: 'Strength Building',
        level,
        days_per_week: isSenior ? 3 : 4,
        plan: getStrengthPlan(level),
        tips: [
          'Progressive overload — increase reps each week',
          'Rest 60-90 seconds between sets for optimal muscle growth',
          'Consume protein within 30 minutes after your workout',
          'Track your form accuracy to avoid injuries',
        ],
      };

    case 'endurance':
    default:
      return {
        goal: 'Endurance',
        level,
        days_per_week: isSenior ? 3 : 5,
        plan: getEndurancePlan(level),
        tips: [
          'Build distance gradually to prevent injuries',
          'Focus on steady breathing and pacing',
          'Cross-train to build overall fitness',
          'Stretch after every session to improve flexibility',
        ],
      };
  }
}

function getWeightLossPlan(level: string): WorkoutPlanDay[] {
  const reps = level === 'beginner' ? 8 : level === 'intermediate' ? 12 : 15;
  const sets = level === 'beginner' ? 2 : 3;

  return [
    {
      day: 'Monday',
      focus: 'Full Body HIIT',
      exercises: [
        { type: 'jumping_jack', name: 'Jumping Jacks', sets, reps: 20, rest_seconds: 30, notes: 'Warm up with high energy' },
        { type: 'squat', name: 'Bodyweight Squats', sets, reps, rest_seconds: 45, notes: 'Focus on depth and form' },
        { type: 'pushup', name: 'Push-ups', sets, reps: Math.floor(reps * 0.8), rest_seconds: 45, notes: 'Keep core tight' },
        { type: 'plank', name: 'Plank Hold', sets: 2, reps: 1, duration_seconds: level === 'beginner' ? 20 : 45, rest_seconds: 30, notes: 'Hold steady' },
      ],
    },
    {
      day: 'Tuesday',
      focus: 'Cardio & Core',
      exercises: [
        { type: 'running', name: 'Interval Running', sets: 1, reps: 1, duration_seconds: 1200, rest_seconds: 0, notes: 'Alternate 1 min sprint / 2 min jog' },
        { type: 'plank', name: 'Plank Hold', sets: 3, reps: 1, duration_seconds: 30, rest_seconds: 30, notes: 'Engage core throughout' },
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Rest / Active Recovery',
      exercises: [
        { type: 'walking', name: 'Brisk Walk', sets: 1, reps: 1, duration_seconds: 1800, rest_seconds: 0, notes: 'Light 30-min walk to stay active' },
      ],
    },
    {
      day: 'Thursday',
      focus: 'Lower Body Burn',
      exercises: [
        { type: 'squat', name: 'Squats', sets, reps, rest_seconds: 45, notes: 'Slow and controlled' },
        { type: 'lunge', name: 'Alternating Lunges', sets, reps: reps * 2, rest_seconds: 45, notes: 'Keep front knee behind toe' },
        { type: 'jumping_jack', name: 'Jumping Jacks', sets: 2, reps: 25, rest_seconds: 30, notes: 'Finish strong!' },
      ],
    },
    {
      day: 'Friday',
      focus: 'Full Body Circuit',
      exercises: [
        { type: 'pushup', name: 'Push-ups', sets, reps, rest_seconds: 30, notes: 'Explosive push' },
        { type: 'squat', name: 'Jump Squats', sets, reps: Math.floor(reps * 0.7), rest_seconds: 45, notes: 'Land softly' },
        { type: 'plank', name: 'Plank', sets: 2, reps: 1, duration_seconds: 40, rest_seconds: 30, notes: 'Hold strong' },
        { type: 'cardio', name: 'Cool Down Cardio', sets: 1, reps: 1, duration_seconds: 300, rest_seconds: 0, notes: 'Light movement to wind down' },
      ],
    },
  ];
}

function getStrengthPlan(level: string): WorkoutPlanDay[] {
  const reps = level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12;
  const sets = level === 'beginner' ? 3 : 4;

  return [
    {
      day: 'Monday',
      focus: 'Upper Body Push',
      exercises: [
        { type: 'pushup', name: 'Standard Push-ups', sets, reps, rest_seconds: 60, notes: 'Full range of motion' },
        { type: 'pushup', name: 'Wide Push-ups', sets: sets - 1, reps: Math.floor(reps * 0.8), rest_seconds: 60, notes: 'Wider hand placement for chest' },
        { type: 'plank', name: 'Plank Hold', sets: 3, reps: 1, duration_seconds: 45, rest_seconds: 30, notes: 'Core stability finisher' },
      ],
    },
    {
      day: 'Tuesday',
      focus: 'Lower Body',
      exercises: [
        { type: 'squat', name: 'Deep Squats', sets, reps, rest_seconds: 60, notes: 'Below parallel' },
        { type: 'lunge', name: 'Walking Lunges', sets, reps: reps * 2, rest_seconds: 60, notes: 'Alternate legs' },
        { type: 'squat', name: 'Pause Squats', sets: 3, reps: Math.floor(reps * 0.7), rest_seconds: 75, notes: 'Pause 3 sec at bottom' },
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Active Recovery',
      exercises: [
        { type: 'walking', name: 'Recovery Walk', sets: 1, reps: 1, duration_seconds: 1200, rest_seconds: 0, notes: 'Light walk + stretching' },
      ],
    },
    {
      day: 'Thursday',
      focus: 'Full Body Power',
      exercises: [
        { type: 'pushup', name: 'Explosive Push-ups', sets: 3, reps: Math.floor(reps * 0.6), rest_seconds: 75, notes: 'Push off the ground' },
        { type: 'squat', name: 'Jump Squats', sets: 3, reps: Math.floor(reps * 0.7), rest_seconds: 60, notes: 'Max height, soft landing' },
        { type: 'lunge', name: 'Reverse Lunges', sets: 3, reps, rest_seconds: 60, notes: 'Step backwards' },
        { type: 'plank', name: 'Extended Plank', sets: 2, reps: 1, duration_seconds: 60, rest_seconds: 30, notes: 'Arms extended' },
      ],
    },
  ];
}

function getEndurancePlan(level: string): WorkoutPlanDay[] {
  const runDuration = level === 'beginner' ? 900 : level === 'intermediate' ? 1500 : 2400;

  return [
    {
      day: 'Monday',
      focus: 'Steady State Cardio',
      exercises: [
        { type: 'running', name: 'Easy Run', sets: 1, reps: 1, duration_seconds: runDuration, rest_seconds: 0, notes: 'Conversational pace' },
        { type: 'plank', name: 'Core Plank', sets: 3, reps: 1, duration_seconds: 30, rest_seconds: 20, notes: 'Post-run core work' },
      ],
    },
    {
      day: 'Tuesday',
      focus: 'Muscular Endurance',
      exercises: [
        { type: 'squat', name: 'High-Rep Squats', sets: 3, reps: 20, rest_seconds: 45, notes: 'Maintain pace, no break' },
        { type: 'pushup', name: 'Push-up Endurance', sets: 3, reps: 15, rest_seconds: 45, notes: 'Slow and steady' },
        { type: 'jumping_jack', name: 'Jumping Jacks', sets: 3, reps: 30, rest_seconds: 30, notes: 'Keep rhythm' },
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Active Recovery',
      exercises: [
        { type: 'walking', name: 'Long Walk', sets: 1, reps: 1, duration_seconds: 2400, rest_seconds: 0, notes: 'Easy pace, enjoy it' },
      ],
    },
    {
      day: 'Thursday',
      focus: 'Interval Training',
      exercises: [
        { type: 'running', name: 'Interval Run', sets: 1, reps: 1, duration_seconds: runDuration, rest_seconds: 0, notes: '30s fast / 60s recovery × 10' },
        { type: 'lunge', name: 'Walking Lunges', sets: 3, reps: 16, rest_seconds: 45, notes: 'Endurance finisher' },
      ],
    },
    {
      day: 'Friday',
      focus: 'Long Run',
      exercises: [
        { type: 'running', name: 'Long Slow Run', sets: 1, reps: 1, duration_seconds: Math.floor(runDuration * 1.5), rest_seconds: 0, notes: 'Build aerobic base' },
      ],
    },
  ];
}

// GET /api/workout-plan — Generate personalized plan
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('fitness_goal, height_cm, weight_kg, age')
      .eq('id', req.user!.id)
      .single();

    if (!user || !user.fitness_goal) {
      // Return default plan if onboarding not completed
      res.json(generateWorkoutPlan('endurance', null, null, null));
      return;
    }

    const plan = generateWorkoutPlan(
      user.fitness_goal,
      user.age,
      user.weight_kg,
      user.height_cm
    );

    res.json(plan);
  } catch (err) {
    console.error('Workout plan error:', err);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

export default router;
