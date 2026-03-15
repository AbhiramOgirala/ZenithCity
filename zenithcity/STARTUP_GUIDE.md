# ZenithCity Startup Guide

## Quick Start (Recommended)

From the root `zenithcity` directory, run both servers at once:

```bash
npm run dev
```

This will start:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

## Manual Start (Alternative)

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## Common Issues & Solutions

### 1. Backend Won't Start

**Error**: `Cannot find module 'dist/index.js'`

**Solution**: Use `npm run dev` instead of `npm start` (dev mode doesn't require building)

### 2. 401 Unauthorized Errors

**Cause**: You're not logged in yet

**Solution**: 
1. Make sure backend is running
2. Go to `http://localhost:5173/auth`
3. Create an account or login
4. The token will be stored in localStorage

### 3. WebSocket Connection Failed

**Cause**: Backend not running or proxy misconfigured

**Solution**: 
- Ensure backend is running on port 3001
- Vite proxy is already configured for `/socket.io`
- Restart frontend if you just started backend

### 4. Redis Connection Warning

**Message**: `⚠️ Redis unavailable, using in-memory fallback`

**Impact**: Non-critical - app will work with in-memory cache

**Solution** (optional): Install and start Redis
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. Database Connection Issues

**Check**: Verify Supabase credentials in `backend/.env`
```env
SUPABASE_URL=https://yzermiqhktaaevznnpll.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Test**: Visit your Supabase project dashboard to ensure it's active

## Environment Variables

### Backend (.env)
```env
PORT=3001
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
```

### Frontend
No .env needed - uses Vite proxy to backend

## Verification Steps

1. **Backend Health Check**
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend Access**
   Open browser to `http://localhost:5173`
   Should see ZenithCity login page

3. **Create Account**
   - Click "Create Account"
   - Enter email, username, password
   - Password requirements: 8+ chars, uppercase, number
   - Username: 3-100 alphanumeric chars

4. **Check Console**
   - Backend: Should see "🚀 ZenithCity backend running on port 3001"
   - Frontend: Should see "Socket connected" after login

## Fixed Issues

✅ THREE.js invalid color format (#FFFF0020 → #FFFF00)
✅ React Router future flags added
✅ Socket.io proxy configured in Vite
✅ WebSocket connection routing
✅ Authentication check before API calls (prevents 401 errors on load)
✅ Proper redirect logic for authenticated/unauthenticated users

## Architecture

```
Frontend (Vite + React)
  ↓ HTTP /api/* → Proxy → Backend Express
  ↓ WS /socket.io → Proxy → Backend Socket.io
  
Backend (Express + Socket.io)
  ↓ Supabase (PostgreSQL)
  ↓ Redis (optional cache)
```

## Next Steps After Startup

1. Login/Register at `/auth`
2. View dashboard at `/dashboard`
3. Start a workout at `/workout`
4. Build your city at `/city`
5. Check leaderboard at `/leaderboard`

## Troubleshooting

If you still see errors after following this guide:

1. Stop all servers (Ctrl+C)
2. Clear browser cache and localStorage
3. Restart backend first, then frontend
4. Check browser console for specific errors
5. Check terminal output for backend errors
