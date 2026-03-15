import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/feedback  (store form feedback from workout)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workout_session_id, exercise_type, feedback_message, rep_number } = req.body;

    const { data, error } = await supabase
      .from('form_feedback_history')
      .insert({
        id: uuidv4(),
        workout_session_id,
        user_id: req.user!.id,
        exercise_type,
        feedback_message,
        rep_number: rep_number || 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Check technique mastery badge (10 consecutive correct sessions)
    const { count } = await supabase
      .from('workout_sessions')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user!.id)
      .gte('form_accuracy', 0.85)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (count === 10) {
      await supabase
        .from('users')
        .update({ technique_mastery_badge: true })
        .eq('id', req.user!.id);
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedback/history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data } = await supabase
      .from('form_feedback_history')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback history' });
  }
});

export default router;
