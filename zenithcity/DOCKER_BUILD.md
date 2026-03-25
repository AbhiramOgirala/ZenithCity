# Docker Build Guide

## Quick Start

To build and run the entire application with Docker:

```bash
# Build both backend and frontend, then create Docker images
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

## Individual Service Commands

### Backend Only
```bash
cd backend
npm run build:verify  # Build and verify TypeScript compilation
docker build -t zenithcity-backend .
```

### Frontend Only
```bash
cd frontend
npm run build
docker build -t zenithcity-frontend .
```

## Troubleshooting

### TypeScript Compilation Errors
If you get TypeScript errors during Docker build:
```bash
cd backend
npm run build:verify  # Check for TS errors locally first
```

### Common TypeScript Issues Fixed:
- ✅ CORS origin array type issues (undefined values)
- ✅ Socket.io CORS configuration type safety
- ✅ Environment variable handling

### "dist not found" Error
This happens when the TypeScript code hasn't been compiled. The Docker build now handles this automatically.

### Build Context Issues
Make sure you're running Docker commands from the correct directory:
- For backend: `cd backend && docker build .`
- For full stack: `docker-compose build` from root

### Environment Variables
Copy `.env.example` to `.env` in both backend and root directories and fill in your values before building.

## Build Verification

Test the backend build locally:
```bash
cd backend
npm run build:verify
```

## Production Deployment

### Render (Backend)
The backend is configured to build automatically on Render with:
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### Vercel (Frontend)  
The frontend builds automatically on Vercel with the `vercel.json` configuration.

## Docker Build Performance

The multi-stage Dockerfile optimizes build time by:
1. Installing dependencies in builder stage
2. Compiling TypeScript in builder stage  
3. Creating minimal production image with only compiled code
4. Using Alpine Linux for smaller image size

## Health Checks

Both Docker containers include health checks:
- Backend: `GET /health` endpoint
- Frontend: Nginx status check