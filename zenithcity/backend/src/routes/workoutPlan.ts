import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cache } from '../config/redis';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Hardcoded plan templates keyed by goal + level
// Used as fallback when Gemini/AI fails or offline
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
    diet_plan: DAYS_OF_WEEK.reduce((acc, obj) => {
        acc[obj] = {
            breakfast: { description: "Poha or Moong Dal Chilla", calories: 350, protein: 12, carbs: 55, fat: 6, sugar: 5 },
            mid_snack: { description: "Handful of roasted Makhana (fox nuts)", calories: 120, protein: 4, carbs: 18, fat: 3, sugar: 1 },
            lunch: { description: "2 Roti, a bowl of Dal, and Subzi (mixed veg or chicken)", calories: 450, protein: 20, carbs: 60, fat: 12, sugar: 5 },
            snacks: { description: "Masala Chai (less sugar) and two Marie biscuits", calories: 110, protein: 3, carbs: 18, fat: 2, sugar: 6 },
            dinner: { description: "Paneer Bhurji or Grilled chicken with 1 Roti and salad", calories: 400, protein: 25, carbs: 20, fat: 18, sugar: 4 },
            daily_calories: 2100,
            daily_protein: 140,
            daily_carbs: 230
        };
        return acc;
    }, {} as Record<string, any>),
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
    const userId = req.user!.id;
    const force = req.query.force === 'true';
    const cacheKey = `workout_plan:${userId}`;

    // 1. Try Cache (Redis)
    if (!force) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }

    // 2. Try Supabase (Persistent)
    const { data: user } = await supabase
      .from('users')
      .select('fitness_goal, fitness_level, age, weight_kg, height_cm, current_plan_json')
      .eq('id', userId)
      .single();

    if (!force && user?.current_plan_json) {
      const plan = user.current_plan_json;
      await cache.set(cacheKey, JSON.stringify(plan), 604800); // Backfill Redis
      res.json(plan);
      return;
    }

    const goal = user?.fitness_goal || 'general_fitness';
    const level = user?.fitness_level || 'beginner';

    try {
      if (process.env.GEMINI_API_KEY) {
        console.log(`[Gemini] Starting plan generation for user ${userId} using gemini-3.1-flash-lite-preview...`);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
Generate a personalized 7-day workout and an Indian nutrition diet plan.
Goal: ${goal}
Fitness Level: ${level}
Age: ${user?.age || 'unknown'}
Weight: ${user?.weight_kg ? user?.weight_kg + ' kg' : 'unknown'}
Height: ${user?.height_cm ? user?.height_cm + ' cm' : 'unknown'}

Ensure the diet_plan exclusively features delicious, healthy, high-protein Indian dietary choices (e.g., Dal, Paneer, Chicken curry, Roti, Dosa, Poha, Chilla, Makhana, etc).

You must return a valid JSON object matching exactly this schema:
{
  "goal": "string (the user's goal formatted dynamically)",
  "level": "${level}",
  "days_per_week": number,
  "plan": [
    {
      "day": "Monday",
      "focus": "string (e.g., 'Upper Body', 'Lower Body', 'Rest & Recovery')",
      "exercises": [
        {
          "type": "squat" | "pushup" | "lunge" | "plank" | "jumping_jack" | "cardio" | "running" | "walking",
          "name": "string (friendly name of the exercise)",
          "sets": number,
          "reps": number,
          "duration_seconds": number,
          "rest_seconds": number,
          "notes": "string"
        }
      ]
    }
  ],
  "diet_plan": {
    "Monday": {
      "breakfast": {
        "description": "string",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "sugar": number
      },
      "mid_snack": { "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "sugar": number },
      "lunch": { "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "sugar": number },
      "snacks": { "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "sugar": number },
      "dinner": { "description": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "sugar": number },
      "daily_calories": number,
      "daily_protein": number,
      "daily_carbs": number
    },
    // Same for Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  },
  "tips": [
    "string"
  ]
}

Instructions for plan array:
- Must have exactly 7 entries, one for each day of the week (Monday through Sunday).
- For 'exercises.type', you MUST ONLY pick one of the exact string literals listed above (e.g., "squat", "pushup", etc). If it's a rest day, leave 'exercises' empty.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        console.log(`[Gemini] Successfully generated plan for user ${userId}. Parsing response...`);
        const generatedText = response.text || '';
        const aiPlan = JSON.parse(generatedText);
        
        // Ensure diet_plan exists in response
        if (aiPlan.diet_plan && aiPlan.plan) {
          // Persist to Supabase & Redis
          await Promise.all([
            cache.set(cacheKey, JSON.stringify(aiPlan), 604800),
            supabase.from('users').update({ current_plan_json: aiPlan }).eq('id', userId)
          ]);

          res.json(aiPlan);
          return;
        }
      }
    } catch (aiErr) {
      console.error('Gemini AI failed, falling back to static plan:', aiErr);
    }

    const fallbackPlan = buildPlan(goal, level, level);
    res.json(fallbackPlan);
  } catch (err) {
    console.error('Workout plan error:', err);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

// POST /api/workout-plan/upgrade
// Upgrades fitness level and force-regenerates a next-level plan
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { data: user } = await supabase.from('users').select('fitness_level').eq('id', userId).single();
        
        const levels = ['beginner', 'intermediate', 'advanced'];
        const currentLevel = user?.fitness_level || 'beginner';
        const currentIndex = levels.indexOf(currentLevel.toLowerCase());
        
        if (currentIndex < levels.length - 1) {
            const nextLevel = levels[currentIndex + 1];
            await supabase.from('users').update({ 
                fitness_level: nextLevel,
                updated_at: new Date().toISOString()
            }).eq('id', userId);
            
            // Success - client should call GET /?force=true next
            res.json({ success: true, from: currentLevel, to: nextLevel });
        } else {
            res.status(400).json({ error: 'You are already at the Advanced level!' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to upgrade level' });
    }
});

export default router;
