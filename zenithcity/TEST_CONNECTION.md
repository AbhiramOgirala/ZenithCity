# Testing Backend Connection

## Step 1: Verify Backend is Running

Open a terminal and run:
```bash
cd zenithcity/backend
npm run dev
```

You should see:
```
✅ Redis connected (or ⚠️ Redis unavailable, using in-memory fallback)
🚀 ZenithCity backend running on port 3001
```

## Step 2: Test Backend Health Endpoint

In another terminal or browser:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

## Step 3: Start Frontend

```bash
cd zenithcity/frontend
npm run dev
```

You should see:
```
VITE v5.4.21  ready in 283 ms
➜  Local:   http://localhost:5173/
```

## Step 4: Access the Application

1. Open browser to `http://localhost:5173`
2. You should be automatically redirected to `/auth` (login page)
3. The 401 errors should NOT appear anymore

## Step 5: Create an Account

1. Click "Create Account" tab
2. Fill in:
   - Username: 3-100 alphanumeric characters (e.g., `testuser123`)
   - Email: Valid email format (e.g., `test@example.com`)
   - Password: 8+ characters with uppercase and number (e.g., `Test1234`)
3. Click "Build My Empire"

## Step 6: Verify Login

After successful registration/login:
- You should be redirected to `/dashboard`
- No more 401 errors in console
- You should see "Socket connected" in console
- Dashboard should load with your stats

## Troubleshooting

### Still seeing 401 errors?

1. **Clear browser cache and localStorage**:
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Storage → Clear site data
   - Refresh page

2. **Check if backend is actually running**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check browser console for errors**:
   - Look for any red errors
   - Check Network tab for failed requests

4. **Verify environment variables**:
   - Check `backend/.env` has correct Supabase credentials
   - JWT_SECRET should be set

### Backend won't start?

1. **Check if port 3001 is already in use**:
   ```bash
   netstat -ano | findstr :3001
   ```

2. **Kill the process if needed**:
   ```bash
   taskkill /PID <process_id> /F
   ```

3. **Check for missing dependencies**:
   ```bash
   cd backend
   npm install
   ```

### Frontend won't connect?

1. **Verify Vite proxy is working**:
   - Check `frontend/vite.config.ts` has proxy config
   - Restart frontend dev server

2. **Check browser console**:
   - Should NOT see CORS errors
   - Should see API calls going to `/api/*`

## What Changed?

I fixed the following issues:

1. **App.tsx**: Added localStorage token check to PrivateRoute
2. **App.tsx**: Redirect authenticated users away from /auth page
3. **dashboardSlice.ts**: Check for token before making API calls
4. **leaderboardSlice.ts**: Check for token before making API calls

These changes prevent 401 errors from appearing when you're not logged in.

## Expected Behavior

### Before Login:
- Visit `http://localhost:5173` → Redirects to `/auth`
- No API calls are made
- No 401 errors in console

### After Login:
- Redirected to `/dashboard`
- API calls succeed with token
- Socket connects successfully
- Data loads properly

## Quick Test Script

Run this to test everything at once:

```bash
# Terminal 1 - Backend
cd zenithcity/backend && npm run dev

# Terminal 2 - Frontend (wait for backend to start)
cd zenithcity/frontend && npm run dev

# Terminal 3 - Test health
curl http://localhost:3001/health
```

Then open browser to `http://localhost:5173` and create an account.
