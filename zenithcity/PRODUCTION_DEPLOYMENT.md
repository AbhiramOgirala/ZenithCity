# Production Deployment Guide

## Current Deployment URLs

- **Frontend (Vercel):** https://zenith-city.vercel.app
- **Backend (Render):** https://zenithcity.onrender.com

## Environment Variables Setup

### Vercel Frontend Environment Variables

In your Vercel dashboard, add these environment variables:

```
VITE_API_BASE_URL=https://zenithcity.onrender.com
VITE_SOCKET_URL=https://zenithcity.onrender.com
VITE_NODE_ENV=production
```

### Render Backend Environment Variables

In your Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://zenith-city.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
REDIS_HOST=your_redis_host
REDIS_PORT=6379
```

## Deployment Steps

### 1. Backend Deployment (Render)

1. Push backend changes to your repository
2. Render will automatically deploy from your main branch
3. Verify deployment at: https://zenithcity.onrender.com/health

### 2. Frontend Deployment (Vercel)

1. Push frontend changes to your repository
2. Vercel will automatically deploy from your main branch
3. Verify deployment at: https://zenith-city.vercel.app

### 3. Manual Deployment Commands

**Build and test locally:**
```bash
# Build backend
cd backend
npm run build

# Build frontend with production config
cd frontend
cp .env.production .env
npm run build
```

**Deploy to production:**
```bash
# Push to main branch (triggers auto-deployment)
git add .
git commit -m "Production deployment"
git push origin main
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify Vercel URL is added to backend CORS configuration
   - Check that both services are using HTTPS

2. **API Connection Issues**
   - Test backend health: https://zenithcity.onrender.com/health
   - Verify environment variables in Vercel dashboard

3. **Socket.io Connection Issues**
   - Check browser console for WebSocket errors
   - Verify VITE_SOCKET_URL is set correctly

### Testing Production APIs

```bash
# Test backend health
curl https://zenithcity.onrender.com/health

# Test API endpoint (replace with actual endpoint)
curl https://zenithcity.onrender.com/api/auth/profile
```

### Vercel Build Configuration

Create `vercel.json` in frontend directory:
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Render Build Configuration

Render should use these settings:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Node Version:** 20.x

## Monitoring

### Health Checks

- Frontend: https://zenith-city.vercel.app (should load the app)
- Backend: https://zenithcity.onrender.com/health (should return JSON status)

### Logs

- **Vercel:** Check deployment logs in Vercel dashboard
- **Render:** Check application logs in Render dashboard

## Security Considerations

1. **Environment Variables:** Never commit sensitive keys to repository
2. **HTTPS:** Both services should use HTTPS in production
3. **CORS:** Only allow necessary origins
4. **Rate Limiting:** Consider adding rate limiting to API endpoints

## Performance Optimization

1. **Frontend:** Enable Vercel's edge caching
2. **Backend:** Use Redis for session storage and caching
3. **Database:** Optimize Supabase queries and indexes
4. **CDN:** Consider using Vercel's CDN for static assets