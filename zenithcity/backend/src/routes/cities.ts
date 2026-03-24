import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { BUILDING_COSTS, MAX_TERRITORY_SIZE, MAX_BUILDING_LEVEL } from '../utils/points';
import { emitToUser } from '../utils/socket';

const router = Router();

// Auto-complete any buildings whose timer has passed (called on every city fetch)
async function autoCompleteBuildings(cityId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('buildings')
    .update({ status: 'completed' })
    .eq('city_id', cityId)
    .eq('status', 'under_construction')
    .lte('construction_completed_at', now);
}

// GET /api/cities/my-city
router.get('/my-city', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: city } = await supabase
      .from('cities').select('*').eq('user_id', req.user!.id).single();

    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    // Auto-complete expired construction before returning
    await autoCompleteBuildings(city.id);

    const { data: buildings } = await supabase
      .from('buildings').select('*').eq('city_id', city.id).order('created_at');

    res.json({ ...city, buildings: buildings || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch city' });
  }
});

// POST /api/cities/buildings
router.post('/buildings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, position_x = 0, position_y = 0, position_z = 0 } = req.body;

    const buildingConfig = BUILDING_COSTS[type];
    if (!buildingConfig) { res.status(400).json({ error: 'Invalid building type' }); return; }

    // Fetch fresh balance from DB (not cache)
    const { data: user } = await supabase
      .from('users').select('points_balance').eq('id', req.user!.id).single();

    const balance = user?.points_balance ?? 0;

    if (balance < buildingConfig.base_cost) {
      res.status(400).json({
        error: `Not enough points. You have ${balance} pts but need ${buildingConfig.base_cost} pts.`,
        required: buildingConfig.base_cost,
        available: balance,
        deficit: buildingConfig.base_cost - balance,
      });
      return;
    }

    const { data: city } = await supabase
      .from('cities').select('id').eq('user_id', req.user!.id).single();

    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    // Deduct points atomically
    const newBalance = balance - buildingConfig.base_cost;
    const { error: updateErr } = await supabase
      .from('users').update({ points_balance: newBalance }).eq('id', req.user!.id);
    if (updateErr) throw updateErr;

    // Log transaction
    await supabase.from('points_transactions').insert({
      id: uuidv4(),
      user_id: req.user!.id,
      amount: buildingConfig.base_cost,
      type: 'deduct',
      reference_type: 'building_construction',
      reference_id: uuidv4(),
      balance_after: newBalance,
    });

    // 30-second construction time (adjust CONSTRUCTION_SECONDS for production)
    const CONSTRUCTION_SECONDS = 30;
    const completionTime = new Date(Date.now() + CONSTRUCTION_SECONDS * 1000);

    const { data: building, error } = await supabase
      .from('buildings')
      .insert({
        id: uuidv4(),
        city_id: city.id,
        type,
        level: 1,
        status: 'under_construction',
        health: 100,
        position_x, position_y, position_z,
        construction_started_at: new Date().toISOString(),
        construction_completed_at: completionTime.toISOString(),
      })
      .select().single();

    if (error) throw error;

    // Emit socket event for points deduction
    emitToUser(req.user!.id, 'points:balance_update', {
      new_balance: newBalance,
      points_spent: buildingConfig.base_cost,
      reason: 'building_construction'
    });

    // Return building + new balance so frontend can sync immediately
    res.status(201).json({ building, new_balance: newBalance });
  } catch (err) {
    console.error('Build error:', err);
    res.status(500).json({ error: 'Failed to construct building' });
  }
});

// PUT /api/cities/buildings/:id/upgrade
router.put('/buildings/:id/upgrade', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: building } = await supabase
      .from('buildings').select('*, cities!inner(user_id)').eq('id', req.params.id).single();

    if (!building || (building.cities as any).user_id !== req.user!.id) {
      res.status(404).json({ error: 'Building not found' }); return;
    }
    if (building.status !== 'completed') {
      res.status(400).json({ error: 'Building must be completed before upgrading' }); return;
    }
    if (building.level >= MAX_BUILDING_LEVEL) {
      res.status(400).json({ error: 'Already at maximum level (3)' }); return;
    }

    const cfg = BUILDING_COSTS[building.type as string];
    if (!cfg) { res.status(400).json({ error: 'Unknown building type' }); return; }

    const upgradeCost = Math.floor(cfg.base_cost * Math.pow(cfg.upgrade_multiplier, building.level));

    const { data: user } = await supabase
      .from('users').select('points_balance').eq('id', req.user!.id).single();

    const balance = user?.points_balance ?? 0;
    if (balance < upgradeCost) {
      res.status(400).json({
        error: `Not enough points. Need ${upgradeCost} pts, have ${balance} pts.`,
        required: upgradeCost,
        available: balance,
      });
      return;
    }

    const newBalance = balance - upgradeCost;
    await supabase.from('users').update({ points_balance: newBalance }).eq('id', req.user!.id);
    await supabase.from('points_transactions').insert({
      id: uuidv4(), user_id: req.user!.id,
      amount: upgradeCost, type: 'deduct',
      reference_type: 'building_upgrade', reference_id: building.id,
      balance_after: newBalance,
    });

    const { data: upgraded, error } = await supabase
      .from('buildings').update({ level: building.level + 1 }).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Emit socket event for points deduction
    emitToUser(req.user!.id, 'points:balance_update', {
      new_balance: newBalance,
      points_spent: upgradeCost,
      reason: 'building_upgrade'
    });

    res.json({ building: upgraded, new_balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upgrade building' });
  }
});

// PUT /api/cities/buildings/:id/repair
router.put('/buildings/:id/repair', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: building } = await supabase
      .from('buildings').select('*, cities!inner(user_id)').eq('id', req.params.id).single();

    if (!building || (building.cities as any).user_id !== req.user!.id) {
      res.status(404).json({ error: 'Building not found' }); return;
    }

    const REPAIR_COST = 200;
    const { data: user } = await supabase
      .from('users').select('points_balance').eq('id', req.user!.id).single();

    const balance = user?.points_balance ?? 0;
    if (balance < REPAIR_COST) {
      res.status(400).json({ error: `Need ${REPAIR_COST} pts to repair. You have ${balance} pts.` }); return;
    }

    const newBalance = balance - REPAIR_COST;
    await supabase.from('users').update({ points_balance: newBalance }).eq('id', req.user!.id);
    await supabase.from('points_transactions').insert({
      id: uuidv4(), user_id: req.user!.id,
      amount: REPAIR_COST, type: 'deduct',
      reference_type: 'building_repair', reference_id: building.id,
      balance_after: newBalance,
    });

    const { data: repaired } = await supabase
      .from('buildings').update({ health: 100, status: 'completed' }).eq('id', req.params.id).select().single();

    // Emit socket event for points deduction
    emitToUser(req.user!.id, 'points:balance_update', {
      new_balance: newBalance,
      points_spent: REPAIR_COST,
      reason: 'building_repair'
    });

    res.json({ building: repaired, new_balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to repair building' });
  }
});

// POST /api/cities/expand-territory
router.post('/expand-territory', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { points_to_spend } = req.body;
    if (!points_to_spend || points_to_spend < 1000) {
      res.status(400).json({ error: 'Minimum 1000 pts to expand territory' }); return;
    }

    const { data: city } = await supabase
      .from('cities').select('*').eq('user_id', req.user!.id).single();
    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    if (city.territory_size >= MAX_TERRITORY_SIZE) {
      res.status(400).json({ error: 'Territory is at maximum size (10,000 sqm)' }); return;
    }

    const { data: user } = await supabase
      .from('users').select('points_balance').eq('id', req.user!.id).single();
    const balance = user?.points_balance ?? 0;
    if (balance < points_to_spend) {
      res.status(400).json({ error: `Not enough points` }); return;
    }

    // 1000 pts = 100 sqm
    const expansion = Math.floor((points_to_spend / 1000) * 100);
    const newSize   = Math.min(MAX_TERRITORY_SIZE, city.territory_size + expansion);
    const newBalance = balance - points_to_spend;

    await supabase.from('users').update({ points_balance: newBalance }).eq('id', req.user!.id);
    const { data: updated } = await supabase
      .from('cities').update({ territory_size: newSize }).eq('id', city.id).select().single();

    // Emit socket event for points deduction
    emitToUser(req.user!.id, 'points:balance_update', {
      new_balance: newBalance,
      points_spent: points_to_spend,
      reason: 'territory_expansion'
    });

    res.json({ city: updated, expansion_amount: expansion, new_balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to expand territory' });
  }
});

export default router;
