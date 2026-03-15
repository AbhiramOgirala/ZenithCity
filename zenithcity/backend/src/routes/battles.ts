import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/battles/upcoming
router.get('/upcoming', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: battles } = await supabase
      .from('territory_battles')
      .select('*')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at');

    const battlesWithEnrollment = await Promise.all(
      (battles || []).map(async (battle) => {
        const { data: participant } = await supabase
          .from('battle_participants')
          .select('id')
          .eq('battle_id', battle.id)
          .eq('user_id', req.user!.id)
          .single();

        const { count } = await supabase
          .from('battle_participants')
          .select('id', { count: 'exact' })
          .eq('battle_id', battle.id);

        return { ...battle, is_enrolled: !!participant, participant_count: count || 0 };
      })
    );

    res.json(battlesWithEnrollment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
});

// GET /api/battles/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: battle } = await supabase
      .from('territory_battles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    const { data: participants } = await supabase
      .from('battle_participants')
      .select('*, users!inner(username, privacy_mode)')
      .eq('battle_id', battle.id)
      .order('battle_points', { ascending: false });

    const rankedParticipants = (participants || []).map((p, idx) => ({
      ...p,
      rank: idx + 1,
      display_name: (p.users as any).privacy_mode
        ? `Player_${p.user_id.slice(0, 6)}`
        : (p.users as any).username,
    }));

    const userParticipant = rankedParticipants.find(p => p.user_id === req.user!.id);

    res.json({ battle, participants: rankedParticipants, user_participant: userParticipant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch battle' });
  }
});

// POST /api/battles/:id/join
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: battle } = await supabase
      .from('territory_battles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (new Date(battle.ends_at) < new Date()) {
      res.status(400).json({ error: 'Battle has already ended' });
      return;
    }

    const { data: participant, error } = await supabase
      .from('battle_participants')
      .insert({
        id: uuidv4(),
        battle_id: battle.id,
        user_id: req.user!.id,
        battle_points: 0,
      })
      .select()
      .single();

    if (error?.code === '23505') {
      res.status(409).json({ error: 'Already enrolled in this battle' });
      return;
    }
    if (error) throw error;

    res.status(201).json(participant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to join battle' });
  }
});

// POST /api/battles (create - admin/system)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, starts_at, ends_at } = req.body;

    const { data: battle, error } = await supabase
      .from('territory_battles')
      .insert({
        id: uuidv4(),
        name,
        starts_at,
        ends_at,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-enroll opted-in users
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('battle_auto_enroll', true);

    if (users && users.length > 0) {
      await supabase.from('battle_participants').insert(
        users.map(u => ({
          id: uuidv4(),
          battle_id: battle.id,
          user_id: u.id,
          battle_points: 0,
        }))
      );
    }

    res.status(201).json(battle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

export default router;
