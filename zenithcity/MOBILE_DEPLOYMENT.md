# Mobile & Production Deployment Guide

## Common Mobile Issues & Solutions

### 404 NOT_FOUND Error on Mobile

This error typically occurs when:

1. **Wrong API URLs** - Mobile devices can't access `localhost`
2. **CORS issues** - Backend not configured for mobile access
3. **Network connectivity** - Mobile device can't reach the backend

## Quick Fixes

### 1. Environment Configuration

**For Local Development with Mobile Testing:**
```env
# frontend/.env.local
VITE_API_BASE_URL=http://YOUR_COMPUTER_IP:3001
VITE_SOCKET_URL=http://YOUR_COMPUTER_IP:3001
```

**For Production Deployment:**
```env
# frontend/.env.production (already created)
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

### 2. Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your network adapter
```

**Mac/Linux:**
```bash
ifconfig | grep inet
# Look for your local network IP (usually 192.168.x.x)
```

### 3. Update Backend CORS

The backend should allow your mobile device's requests. Update `backend/src/index.ts`:

```typescript
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://YOUR_IP:5173', '*'], 
  credentials: true 
}));
```

### 4. Mobile Testing Commands

**Start development with IP access:**
```bash
# Frontend (accessible from mobile)
cd frontend
npm run dev -- --host 0.0.0.0

# Backend (accessible from mobile)  
cd backend
npm run dev
```

**Access from mobile:**
- Frontend: `http://YOUR_IP:5173`
- Backend API: `http://YOUR_IP:3001`

### 5. Production Deployment

**Build and deploy:**
```bash
# Build with production config
npm run build

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting Steps

1. **Check network connectivity:**
   ```bash
   # From mobile browser, visit:
   http://YOUR_IP:3001/health
   ```

2. **Verify environment variables:**
   ```bash
   # Check what URLs the frontend is using
   console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
   ```

3. **Check backend logs:**
   ```bash
   docker-compose logs backend
   ```

4. **Test API endpoints:**
   ```bash
   curl http://YOUR_IP:3001/api/auth/profile
   ```

## Production Checklist

- [ ] Environment variables configured for production
- [ ] CORS configured for your domain
- [ ] HTTPS enabled (for production)
- [ ] Database accessible from production server
- [ ] Redis accessible from production server
- [ ] Health checks working
- [ ] Mobile responsive design tested

## Common Error Codes

- `404 NOT_FOUND` - Wrong URL or routing issue
- `CORS Error` - Backend not allowing frontend domain
- `Network Error` - Can't reach backend from mobile
- `Connection Refused` - Backend not running or wrong port