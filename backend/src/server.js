import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket/socketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

import rateLimiter from './middleware/rateLimiter.js';
import securitySanitizer from './middleware/securitySanitizer.js';

// Parse allowed CORS origins from CLIENT_URL (supports comma-separated origins)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied by policy'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(securitySanitizer);

// Initialize Socket.IO
initSocket(httpServer);

// Root Route Handler
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KaamSetu AI Backend API & Socket.IO Server is Running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      jobs: '/api/jobs',
      projects: '/api/projects',
      conversations: '/api/conversations',
      notifications: '/api/notifications',
      complaints: '/api/complaints',
      disputes: '/api/disputes',
    },
  });
});

// API Routes
app.use('/api', routes);

// 404 & Centralized Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

import mongoose from 'mongoose';

// Start Database Connection & Server
const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`[KaamSetu AI] HTTP & Socket.IO Server is running on port ${PORT}`);
  });
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`[KaamSetu AI] Received ${signal}. Closing server gracefully...`);
  httpServer.close(async () => {
    console.log('[KaamSetu AI] HTTP server closed.');
    try {
      await mongoose.connection.close(false);
      console.log('[KaamSetu AI] MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('[KaamSetu AI] Error during database disconnect:', err.message);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { app, httpServer };
export default app;

