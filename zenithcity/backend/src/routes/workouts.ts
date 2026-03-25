import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateWorkoutPoints, calculateRouteDistance, MIN_WORKOUT_DURATION } from '../utils/points';
import { ExerciseType, VerificationStatus } from '../types';
import { emitToUser } from '../utils/socket';

const router = Router();

// POST /api/workouts/start
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { exercise_type, verification_status = 'pending' } = req.body;

    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        id: uuidv4(),
        user_id: req.user!.id,
        exercise_type,
        started_at: new Date().toISOString(),
        verification_status,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start workout' });
  }
});

// PUT /api/workouts/:id/complete
router.put('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { total_reps = 0, valid_reps = 0, form_accuracy = 0, verification_status, gps_coordinates } = req.body;

    // Fetch session
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - new Date(session.started_at).getTime()) / 1000);

    // Validate minimum duration
    if (durationSeconds < MIN_WORKOUT_DURATION) {
      res.status(400).json({ error: `Workout must be at least ${MIN_WORKOUT_DURATION} seconds` });
      return;
    }

    // Calculate GPS distance
    let gpsDistanceKm = 0;
    if (gps_coordinates && gps_coordinates.length > 1) {
      gpsDistanceKm = calculateRouteDistance(gps_coordinates);

      // Store GPS route
      const routeId = uuidv4();
      await supabase.from('gps_routes').insert({
        id: routeId,
        workout_session_id: id,
        total_distance_km: gpsDistanceKm,
      });

      const coordInserts = gps_coordinates.map((c: any) => ({
        id: uuidv4(),
        route_id: routeId,
        latitude: c.latitude,
        longitude: c.longitude,
        altitude: c.altitude || 0,
        accuracy: c.accuracy || 0,
        timestamp: c.timestamp || new Date().toISOString(),
      }));
      await supabase.from('gps_coordinates').insert(coordInserts);
    }

    const finalVerification = (verification_status || session.verification_status) as VerificationStatus;
    const gpsExercises = ['running', 'walking'];
    const isGPSExercise = gpsExercises.includes(session.exercise_type);
    // Enforce: manual (no camera) = 0 reps for non-GPS
    const finalValidReps = finalVerification === 'manual' && !isGPSExercise ? 0 : (valid_reps || 0);
    const finalFormAccuracy = finalVerification === 'manual' && !isGPSExercise ? 0 : (form_accuracy || 0);

    const points = calculateWorkoutPoints({
      exercise_type: session.exercise_type as ExerciseType,
      duration_seconds: durationSeconds,
      valid_reps: finalValidReps,
      gps_distance_km: gpsDistanceKm,
      verification_status: finalVerification,
    });

    // Update session
    const { data: updated, error } = await supabase
      .from('workout_sessions')
      .update({
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
        total_reps: total_reps || 0,
        valid_reps: finalValidReps,
        form_accuracy: finalFormAccuracy,
        verification_status: finalVerification,
        points_earned: points,
        gps_distance_km: gpsDistanceKm,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Award points — returns the new balance
    const newBalance = await awardPoints(req.user!.id, points, 'workout', id);

    // Update battle points if user is in active battles
    await updateBattlePoints(req.user!.id, points);

    // Update city state (halt decline, restore health)
    await updateCityAfterWorkout(req.user!.id);

    // Update streak
    const streakData = await updateStreak(req.user!.id);

    // Emit socket event for real-time points update
    emitToUser(req.user!.id, 'points:balance_update', {
      new_balance: newBalance,
      points_earned: points,
      reason: 'workout'
    });

    // Emit streak update
    if (streakData) {
      emitToUser(req.user!.id, 'streak:update', streakData);
    }

    // Return new_balance so frontend can sync immediately without an extra API call
    res.json({ session: updated, points_earned: points, new_balance: newBalance, streak: streakData });
  } catch (err) {
    console.error('Complete workout error:', err);
    res.status(500).json({ error: 'Failed to complete workout' });
  }
});

async function awardPoints(userId: string, amount: number, refType: string, refId: string): Promise<number> {
  const { data: user } = await supabase
    .from('users').select('points_balance').eq('id', userId).single();

  const currentBalance = user?.points_balance || 0;
  const newBalance = currentBalance + amount;

  await supabase.from('users').update({ points_balance: newBalance }).eq('id', userId);
  await supabase.from('points_transactions').insert({
    id: uuidv4(), user_id: userId, amount,
    type: 'award', reference_type: refType, reference_id: refId, balance_after: newBalance,
  });
  return newBalance;
}

async function updateBattlePoints(userId: string, points: number): Promise<void> {
  try {
    // Find active battles user is participating in
    const now = new Date().toISOString();
    const { data: activeBattles } = await supabase
      .from('battle_participants')
      .select('id, battle_points, territory_battles!inner(*)')
      .eq('user_id', userId)
      .lte('territory_battles.starts_at', now)
      .gte('territory_battles.ends_at', now)
      .eq('territory_battles.status', 'active');

    if (activeBattles && activeBattles.length > 0) {
      // Update battle points for each active battle
      for (const battle of activeBattles) {
        const newBattlePoints = battle.battle_points + points;
        await supabase
          .from('battle_participants')
          .update({ battle_points: newBattlePoints })
          .eq('id', battle.id);

        // Emit socket event for battle points update
        emitToUser(userId, 'battle:points_earned', {
          battle_id: (battle as any).territory_battles.id,
          battle_points: points,
          total_battle_points: newBattlePoints
        });
      }
    }
  } catch (err) {
    console.error('Failed to update battle points:', err);
    // Don't throw - battle points are secondary to workout completion
  }
}

async function updateCityAfterWorkout(userId: string): Promise<void> {
  const { data: city } = await supabase.from('cities').select('*').eq('user_id', userId).single();
  if (!city) return;

  await supabase.from('cities').update({
    last_workout_at: new Date().toISOString(),
    decline_active: false,
  }).eq('id', city.id);

  // Restore 10% health to all buildings
  try {
    await supabase.rpc('restore_building_health', { p_city_id: city.id });
  } catch {
    // Fallback if RPC not available - restore health manually
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, health')
      .eq('city_id', city.id);
    
    if (buildings) {
      for (const b of buildings) {
        const newHealth = Math.min(100, b.health + 10);
        await supabase.from('buildings').update({ health: newHealth }).eq('id', b.id);
      }
    }
  }
}

/**
 * Update workout streak for a user.
 * Streak increments if user worked out yesterday or earlier today.
 * Streak resets to 1 if they missed a day.
 */
async function updateStreak(userId: string): Promise<{ current_streak: number; best_streak: number; streak_bonus: number } | null> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('current_streak, best_streak, last_workout_date')
      .eq('id', userId)
      .single();

    if (!user) return null;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastDate = user.last_workout_date;

    let newStreak = user.current_streak || 0;

    if (lastDate === today) {
      // Already worked out today — no streak change
      return { current_streak: newStreak, best_streak: user.best_streak || 0, streak_bonus: 0 };
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (lastDate === yesterday) {
      // Consecutive day — increment streak
      newStreak += 1;
    } else {
      // Missed a day — reset streak
      newStreak = 1;
    }

    const newBest = Math.max(newStreak, user.best_streak || 0);

    // Streak bonus: 5 extra points per streak day beyond 2
    const streakBonus = newStreak > 2 ? (newStreak - 2) * 5 : 0;

    await supabase.from('users').update({
      current_streak: newStreak,
      best_streak: newBest,
      last_workout_date: today,
    }).eq('id', userId);

    // Award streak bonus points if applicable
    if (streakBonus > 0) {
      const { data: freshUser } = await supabase
        .from('users').select('points_balance').eq('id', userId).single();
      if (freshUser) {
        const newBalance = (freshUser.points_balance || 0) + streakBonus;
        await supabase.from('users').update({ points_balance: newBalance }).eq('id', userId);
        await supabase.from('points_transactions').insert({
          id: require('uuid').v4(),
          user_id: userId,
          amount: streakBonus,
          type: 'award',
          reference_type: 'streak_bonus',
          reference_id: null,
          balance_after: newBalance,
        });
      }
    }

    return { current_streak: newStreak, best_streak: newBest, streak_bonus: streakBonus };
  } catch (err) {
    console.error('Streak update error:', err);
    return null;
  }
}

// GET /api/workouts/history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: sessions, error, count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.id)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ sessions, total: count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/workouts/history
// Returns all completed workouts for the user
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { data: history } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', req.user!.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit);

    res.json(history || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workout history' });
  }
});

// GET /api/workouts/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Fetch feedback
    const { data: feedback } = await supabase
      .from('form_feedback_history')
      .select('*')
      .eq('workout_session_id', session.id)
      .order('timestamp');

    // Fetch GPS route if any
    const { data: route } = await supabase
      .from('gps_routes')
      .select('*, gps_coordinates(*)')
      .eq('workout_session_id', session.id)
      .single();

    res.json({ session, feedback: feedback || [], gps_route: route });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

export default router;
