import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();

    // All queries in parallel
    const [workoutCount, weeklyPoints, cityData, userRankData, battles, recentWorkouts] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('started_at', thirtyDaysAgo)
        .not('completed_at', 'is', null),

      supabase
        .from('points_transactions')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('type', 'award')
        .gte('created_at', twelveWeeksAgo),

      supabase
        .from('cities')
        .select('*, buildings(*)')
        .eq('user_id', userId)
        .single(),

      supabase
        .from('users')
        .select('points_balance, username')
        .order('points_balance', { ascending: false })
        .limit(200),

      supabase
        .from('territory_battles')
        .select('*')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at')
        .limit(3),

      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
    ]);

    // Calculate weekly points for last 12 weeks
    const weeklyData: Record<string, number> = {};
    (weeklyPoints.data || []).forEach(t => {
      const weekStart = getWeekStart(new Date(t.created_at));
      weeklyData[weekStart] = (weeklyData[weekStart] || 0) + t.amount;
    });

    const weekly_points = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = getWeekStart(new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000));
      weekly_points.push({ week: weekStart, points: weeklyData[weekStart] || 0 });
    }

    // Calculate rank
    const allUsers = userRankData.data || [];
    const { data: currentUser } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', userId)
      .single();

    const viewerPoints = currentUser?.points_balance || 0;
    const rank = allUsers.filter(u => u.points_balance > viewerPoints).length + 1;
    const nextRankUser = allUsers.find(u => u.points_balance > viewerPoints);
    const pointsToNextRank = nextRankUser ? nextRankUser.points_balance - viewerPoints : 0;

    // Fetch streak data
    const { data: streakUser } = await supabase
      .from('users')
      .select('current_streak, best_streak, last_workout_date, onboarding_completed')
      .eq('id', userId)
      .single();

    res.json({
      workouts_last_30_days: workoutCount.count || 0,
      weekly_points,
      city_state: cityData.data,
      leaderboard_rank: rank,
      points_balance: viewerPoints,
      points_to_next_rank: pointsToNextRank,
      upcoming_battles: battles.data || [],
      recent_workouts: recentWorkouts.data || [],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export default router;
