import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { initRedis } from './config/redis';
import { scheduleCityDeclineJob } from './jobs/cityDecline';

import authRoutes from './routes/auth';
import workoutRoutes from './routes/workouts';
import cityRoutes from './routes/cities';
import leaderboardRoutes from './routes/leaderboards';
import battleRoutes from './routes/battles';
import pointsRoutes from './routes/points';
import dashboardRoutes from './routes/dashboard';
import feedbackRoutes from './routes/feedback';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// WebSocket
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('workout:points_update', (data) => {
    io.to(`user:${data.userId}`).emit('workout:points_live', data);
  });

  socket.on('disconnect', () => {});
});

export { io };

async function start() {
  await initRedis();
  scheduleCityDeclineJob().catch(console.error);

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 ZenithCity backend running on port ${PORT}`);
  });
}

start().catch(console.error);
