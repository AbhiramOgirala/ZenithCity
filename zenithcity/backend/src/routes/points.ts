import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cache } from '../config/redis';

const router = Router();

// GET /api/points/balance
router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `user:${req.user!.id}:balance`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.json({ balance: parseInt(cached) });
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', req.user!.id)
      .single();

    const balance = user?.points_balance || 0;
    await cache.set(cacheKey, String(balance), 3600);

    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// GET /api/points/transactions
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, count } = await supabase
      .from('points_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({ transactions: data || [], total: count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/points/refresh - Force refresh balance from database
router.post('/refresh', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Clear cache
    const cacheKey = `user:${req.user!.id}:balance`;
    await cache.del(cacheKey);

    // Fetch fresh balance from database
    const { data: user } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', req.user!.id)
      .single();

    const balance = user?.points_balance || 0;
    
    // Update cache with fresh value
    await cache.set(cacheKey, String(balance), 3600);

    res.json({ balance, refreshed: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh balance' });
  }
});

export default router;
