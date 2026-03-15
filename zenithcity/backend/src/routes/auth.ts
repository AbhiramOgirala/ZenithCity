import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cache } from '../config/redis';

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
    const { email, password, username } = req.body;

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

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ id: userId, email, username, password_hash })
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
      user: { id: userId, email, username },
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
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
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
      .select('id, email, username, privacy_mode, battle_auto_enroll, technique_mastery_badge, points_balance, created_at')
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
    const { username, privacy_mode, battle_auto_enroll } = req.body;
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

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user!.id)
      .select('id, email, username, privacy_mode, battle_auto_enroll')
      .single();

    if (error) throw error;

    // Invalidate cache
    await cache.del(`user:${req.user!.id}:balance`);

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;
