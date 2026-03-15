import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cache } from '../config/redis';

const router = Router();
const CACHE_TTL = 60; // 60 seconds

// GET /api/leaderboards/:type  (all-time | weekly | monthly)
router.get('/:type', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const cacheKey = `leaderboard:${type}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    let query = supabase
      .from('users')
      .select('id, username, privacy_mode, points_balance')
      .order('points_balance', { ascending: false })
      .limit(100);

    if (type === 'weekly') {
      // Sum points from last 7 days via transactions
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weeklyPoints } = await supabase
        .from('points_transactions')
        .select('user_id, amount')
        .eq('type', 'award')
        .gte('created_at', weekAgo);

      // Aggregate by user
      const totals: Record<string, number> = {};
      weeklyPoints?.forEach(t => {
        totals[t.user_id] = (totals[t.user_id] || 0) + t.amount;
      });

      const sorted = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 100);

      const userIds = sorted.map(([id]) => id);
      const { data: users } = await supabase
        .from('users')
        .select('id, username, privacy_mode')
        .in('id', userIds);

      const entries = sorted.map(([userId, points], idx) => {
        const user = users?.find(u => u.id === userId);
        return {
          rank: idx + 1,
          user_id: userId,
          username: user?.privacy_mode ? `Player_${userId.slice(0, 6)}` : user?.username || 'Unknown',
          total_points: points,
        };
      });

      const { data: viewerUser } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', req.user!.id)
        .single();

      const viewerRankIdx = entries.findIndex(e => e.user_id === req.user!.id);

      const result = {
        entries,
        viewer_rank: viewerRankIdx >= 0 ? viewerRankIdx + 1 : entries.length + 1,
        viewer_points: totals[req.user!.id] || 0,
      };

      await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      res.json(result);
      return;
    }

    const { data: users } = await query;

    const entries = (users || []).map((u, idx) => ({
      rank: idx + 1,
      user_id: u.id,
      username: u.privacy_mode ? `Player_${u.id.slice(0, 6)}` : u.username,
      total_points: u.points_balance,
    }));

    const viewerIdx = entries.findIndex(e => e.user_id === req.user!.id);
    const { data: viewer } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', req.user!.id)
      .single();

    const result = {
      entries,
      viewer_rank: viewerIdx >= 0 ? viewerIdx + 1 : entries.length + 1,
      viewer_points: viewer?.points_balance || 0,
    };

    await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    res.json(result);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
