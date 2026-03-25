import { Router, Response } from 'express';
import { google } from 'googleapis';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/database';

const router = Router();

// To make this work in production, add these to your .env:
// GOOGLE_FIT_CLIENT_ID=your_client_id
// GOOGLE_FIT_CLIENT_SECRET=your_client_secret
// GOOGLE_FIT_REDIRECT_URL=http://localhost:3001/api/watch/callback
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_FIT_CLIENT_ID || 'dummy_client_id',
  process.env.GOOGLE_FIT_CLIENT_SECRET || 'dummy_secret',
  process.env.GOOGLE_FIT_REDIRECT_URL || 'http://localhost:3001/api/watch/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
];

// GET /api/watch/connect
// Initiates the OAuth flow
router.get('/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!process.env.GOOGLE_FIT_CLIENT_ID) {
    // If no real keys are provided, we simulate the connection for the MVP
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=simulated`);
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: req.user!.id, // Pass user ID to the callback
  });
  
  res.json({ authUrl: url });
});

// GET /api/watch/callback
// Handles the redirect from Google
router.get('/callback', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, state: userId } = req.query;
  
  if (!code || !userId) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Save tokens to Supabase for this user
    await supabase.from('users').update({
      watch_access_token: tokens.access_token,
      watch_refresh_token: tokens.refresh_token,
      watch_connected: true
    }).eq('id', userId);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=true`);
  } catch (error) {
    console.error('Watch Sync Error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?watch_synced=error`);
  }
});

// GET /api/watch/sync
// Pulls today's step count and heart rate to give Zenith points
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

    if (!user.watch_access_token) {
      // Simulation mode
      res.json({
        success: true,
        data: {
          steps: Math.floor(Math.random() * 5000) + 2000,
          calories_burned: Math.floor(Math.random() * 300) + 100,
          active_minutes: Math.floor(Math.random() * 45) + 15,
          avg_heart_rate: Math.floor(Math.random() * 40) + 80
        },
        pointsEarned: 50
      });
      return;
    }

    // Real API Request to Google Fit
    oauth2Client.setCredentials({
      access_token: user.watch_access_token,
      refresh_token: user.watch_refresh_token
    });

    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const startTimeStamp = new Date().setHours(0, 0, 0, 0); // Start of today
    const endTimeStamp = new Date().getTime(); // Now

    // @ts-ignore: googleapis SDK method overload typing mismatch
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: startTimeStamp.toString(),
        endTimeMillis: endTimeStamp.toString()
      }
    });

    const bucket = response.data.bucket?.[0];
    const steps = bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
    
    // Reward points for steps (e.g. 1 point for every 100 steps)
    const pointsEarned = Math.floor(steps / 100);

    if (pointsEarned > 0) {
      await supabase.rpc('increment_points', { 
        user_id: req.user!.id, 
        amount: pointsEarned 
      });
    }

    res.json({
      success: true,
      data: { steps },
      pointsEarned
    });

  } catch (error) {
    console.error('Failed to sync watch:', error);
    res.status(500).json({ error: 'Failed to sync fitness data' });
  }
});

export default router;
