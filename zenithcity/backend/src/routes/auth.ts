import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cache } from '../config/redis';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zenithcity-secret-key';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,100}$/.test(username);
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes } = req.body;

    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    if (!validatePassword(password)) {
      res.status(400).json({ error: 'Password must be 8+ chars with uppercase and number' });
      return;
    }
    if (!validateUsername(username)) {
      res.status(400).json({ error: 'Username must be 3-100 alphanumeric chars' });
      return;
    }

    // Gemini Goal Safety Check
    if (process.env.GEMINI_API_KEY && fitness_goal && target_weight_kg && time_period_weeks && weight_kg) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
          A user is registering for a fitness app.
          Goal: ${fitness_goal}
          Current Weight: ${weight_kg} kg
          Target Weight: ${target_weight_kg} kg
          Time Period: ${time_period_weeks} weeks
          Time per day available: ${time_per_day_minutes || 30} minutes
          Age: ${age || 'Unknown'}, Gender: ${gender || 'Unknown'}, Health Issues: ${health_issues || 'None'}
          
          Is this goal dangerously fast or overly rigorous for their parameters? (e.g. losing more than 1% of body weight per week, unrealistic strength gains in a short time, etc).
          Respond strictly in JSON format matching this schema:
          {
            "isSafe": boolean,
            "warningMessage": "If unsafe, explain why friendly but firmly, and suggest a better time period (e.g. 'Losing 5kg in 1 week is unsafe. I highly recommend extending your goal to at least 5 weeks.'). Otherwise, leave as empty string."
          }
        `;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        
        const safetyResult = JSON.parse(response.text || '{}');
        if (safetyResult.isSafe === false) {
          res.status(400).json({ error: safetyResult.warningMessage });
          return;
        }
      } catch (err) {
        console.error("Gemini validation error:", err);
        // Fail open if AI check fails to not disrupt registration
      }
    }

    // Check duplicate email or username
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      if (existingUsers[0].email === email) {
        res.status(409).json({ error: 'Email already registered' });
      } else {
        res.status(409).json({ error: 'Username already taken' });
      }
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ 
        id: userId, 
        email, 
        username, 
        password_hash,
        fitness_goal: fitness_goal || null,
        height_cm: height_cm ? parseFloat(height_cm) : null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        health_issues: health_issues || null,
        target_weight_kg: target_weight_kg ? parseFloat(target_weight_kg) : null,
        time_period_weeks: time_period_weeks ? parseInt(time_period_weeks) : null,
        time_per_day_minutes: time_per_day_minutes ? parseInt(time_per_day_minutes) : null,
        onboarding_completed: true // True because they are onboarding during registration
      })
      .select()
      .single();

    if (userError) throw userError;

    // Initialize city
    const { error: cityError } = await supabase
      .from('cities')
      .insert({
        id: uuidv4(),
        user_id: userId,
        name: `${username}'s City`,
        territory_size: 100,
        health: 100,
      });

    if (cityError) throw cityError;

    // Create starter building
    const { data: city } = await supabase
      .from('cities')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (city) {
      await supabase.from('buildings').insert({
        id: uuidv4(),
        city_id: city.id,
        type: 'house',
        level: 1,
        status: 'completed',
        health: 100,
        construction_completed_at: new Date().toISOString(),
      });
    }

    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: { id: userId, email, username, points_balance: 0 },
      token,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body; // Actually contains either email or username

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},username.eq.${email}`)
      .limit(1);

    if (!user || user.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user[0].id, email: user[0].email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user[0].id, email: user[0].email, username: user[0].username, points_balance: user[0].points_balance || 0 },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, username, privacy_mode, battle_auto_enroll, technique_mastery_badge, points_balance, fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes, onboarding_completed, current_streak, best_streak, last_workout_date, created_at')
      .eq('id', req.user!.id)
      .single();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, privacy_mode, battle_auto_enroll, fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes } = req.body;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (username) {
      if (!validateUsername(username)) {
        res.status(400).json({ error: 'Invalid username' });
        return;
      }
      updates.username = username;
    }
    if (privacy_mode !== undefined) updates.privacy_mode = privacy_mode;
    if (battle_auto_enroll !== undefined) updates.battle_auto_enroll = battle_auto_enroll;
    if (fitness_goal !== undefined) updates.fitness_goal = fitness_goal;
    if (height_cm !== undefined) updates.height_cm = height_cm;
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (health_issues !== undefined) updates.health_issues = health_issues;
    if (target_weight_kg !== undefined) updates.target_weight_kg = target_weight_kg;
    if (time_period_weeks !== undefined) updates.time_period_weeks = time_period_weeks;
    if (time_per_day_minutes !== undefined) updates.time_per_day_minutes = time_per_day_minutes;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user!.id)
      .select('id, email, username, privacy_mode, battle_auto_enroll, fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes, points_balance')
      .single();

    if (error) throw error;

    // Invalidate cache
    await cache.del(`user:${req.user!.id}:balance`);

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/auth/onboarding — Save onboarding data
router.post('/onboarding', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes } = req.body;

    // Validate fitness goal
    const validGoals = ['weight_loss', 'strength', 'endurance'];
    if (!fitness_goal || !validGoals.includes(fitness_goal)) {
      res.status(400).json({ error: 'Invalid fitness goal. Must be: weight_loss, strength, or endurance' });
      return;
    }

    // Validate numeric fields
    if (height_cm && (height_cm < 50 || height_cm > 300)) {
      res.status(400).json({ error: 'Height must be between 50 and 300 cm' });
      return;
    }
    if (weight_kg && (weight_kg < 20 || weight_kg > 400)) {
      res.status(400).json({ error: 'Weight must be between 20 and 400 kg' });
      return;
    }
    if (age && (age < 10 || age > 120)) {
      res.status(400).json({ error: 'Age must be between 10 and 120' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        fitness_goal,
        height_cm: height_cm || null,
        weight_kg: weight_kg || null,
        age: age || null,
        gender: gender || null,
        health_issues: health_issues || null,
        target_weight_kg: target_weight_kg || null,
        time_period_weeks: time_period_weeks || null,
        time_per_day_minutes: time_per_day_minutes || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user!.id)
      .select('id, email, username, fitness_goal, height_cm, weight_kg, age, gender, health_issues, target_weight_kg, time_period_weeks, time_per_day_minutes, onboarding_completed, points_balance')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

export default router;
