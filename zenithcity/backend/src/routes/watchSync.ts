import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/database';

const router = Router();

// To make this work in production, add these to your .env:
// STRAVA_CLIENT_ID=your_client_id
// STRAVA_CLIENT_SECRET=your_client_secret
// STRAVA_REDIRECT_URL=https://api.yourdomain.com/api/watch/callback

// GET /api/watch/connect
// Initiates the Strava OAuth flow
router.get('/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URL || 'http://localhost:3001/api/watch/callback';

  if (!clientId) {
    // If no real keys are provided, simulate the connection
    return res.json({ authUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=simulated` });
  }

  // Strava OAuth URL
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=activity:read_all&state=${req.user!.id}`;
  
  // It returns JSON so the frontend can do window.location.href = data.authUrl
  res.json({ authUrl });
});

// GET /api/watch/callback
// Handles the redirect from Strava
router.get('/callback', async (req: AuthRequest, res: Response): Promise<void> => {
  // `state` is the userId passed earlier
  const { code, state: userId } = req.query;
  
  if (!code || !userId) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    });

    const tokens: any = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Strava Token Error: ${tokens.message} - ${JSON.stringify(tokens.errors)}`);
    }

    // Save tokens to Supabase for this user.
    // We repurpose 'watch_access_token' and 'watch_refresh_token' to store Strava securely.
    await supabase.from('users').update({
      watch_access_token: tokens.access_token,
      watch_refresh_token: tokens.refresh_token,
      watch_connected: true
    }).eq('id', userId);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=true`);
  } catch (error: any) {
    console.error('Strava Sync Error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=error`);
  }
});

// Helper function to refresh Strava Token if expired
async function refreshStravaToken(userId: string, refreshToken: string) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const tokens: any = await tokenResponse.json();
  if (tokenResponse.ok) {
    // Update the DB with the new tokens
    await supabase.from('users').update({
      watch_access_token: tokens.access_token,
      watch_refresh_token: tokens.refresh_token
    }).eq('id', userId);
    return tokens.access_token;
  }
  return null;
}

// GET /api/watch/sync
// Pulls today's activities to give Zenith points
router.get('/sync', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('watch_access_token, watch_refresh_token, watch_connected')
      .eq('id', req.user!.id)
      .single();

    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    if (!user.watch_access_token || !process.env.STRAVA_CLIENT_ID) {
      // Simulation mode if Strava isn't connected or keys are missing
      const steps = Math.floor(Math.random() * 5000) + 2000;
      res.json({
        success: true,
        data: {
          steps: steps,
          calories_burned: Math.floor(Math.random() * 300) + 100,
          active_minutes: Math.floor(Math.random() * 45) + 15,
          avg_heart_rate: Math.floor(Math.random() * 40) + 80
        },
        pointsEarned: Math.floor(steps / 100)
      });
      return;
    }

    let accessToken = user.watch_access_token;

    // Calculate start of today in unix timestamp (seconds, not milliseconds for Strava)
    const startOfToday = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

    // Call Strava API for today's activities
    let activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${startOfToday}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // If 401 Unauthorized, token likely expired. Attempt refresh.
    if (activitiesResponse.status === 401 && user.watch_refresh_token) {
      console.log('Strava token expired, refreshing...');
      accessToken = await refreshStravaToken(req.user!.id, user.watch_refresh_token);
      if (accessToken) {
        // Retry the API request with the new token
        activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${startOfToday}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        throw new Error('Failed to refresh Strava token. User needs to re-authenticate.');
      }
    }

    if (!activitiesResponse.ok) {
      throw new Error(`Strava API Error: ${activitiesResponse.statusText}`);
    }

    const activities = (await activitiesResponse.json()) as any[];
    
    // Calculate total moving time (in seconds) and total distance (in meters)
    let totalMovingSeconds = 0;
    let totalDistanceMeters = 0;

    for (const activity of activities) {
      totalMovingSeconds += activity.moving_time || 0;
      totalDistanceMeters += activity.distance || 0;
    }

    // Convert to a 'steps' equivalent to keep backwards compatibility with your frontend design
    // E.g., assume 1 meter ~ 1.3 steps, or 1 minute of activity ~ 100 steps.
    const activeMinutes = Math.floor(totalMovingSeconds / 60);
    const estimatedSteps = Math.floor(totalDistanceMeters * 1.3); 
    
    // We'll award points based on active minutes (e.g. 5 points per active minute)
    // plus distance if they ran, but if they worked out at home (like weightlifting), moving time is better.
    const pointsFromWalkingRunning = Math.floor(estimatedSteps / 100);
    const pointsFromTime = activeMinutes * 5;
    const totalPointsEarned = Math.max(pointsFromWalkingRunning, pointsFromTime);

    // Add points to user account
    if (totalPointsEarned > 0) {
      await supabase.rpc('increment_points', { 
        user_id: req.user!.id, 
        amount: totalPointsEarned 
      });
    }

    res.json({
      success: true,
      data: { 
        steps: estimatedSteps || (activeMinutes * 100), // fallback purely for display 
        active_minutes: activeMinutes 
      },
      pointsEarned: totalPointsEarned
    });

  } catch (error: any) {
    console.error('Failed to sync Strava:', error.message);
    res.status(500).json({ error: 'Failed to sync fitness data' });
  }
});

export default router;
