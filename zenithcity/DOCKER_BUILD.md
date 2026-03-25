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
npm run build
npm run docker:build
```

### Frontend Only
```bash
cd frontend
npm run build
docker build -t zenithcity-frontend .
```

## Troubleshooting

### "dist not found" Error
This happens when the TypeScript code hasn't been compiled. Run:
```bash
npm run build
```

### Build Context Issues
Make sure you're running Docker commands from the correct directory:
- For backend: `cd backend && docker build .`
- For full stack: `docker-compose build` from root

### Environment Variables
Copy `.env.example` to `.env` in both backend and root directories and fill in your values before building.