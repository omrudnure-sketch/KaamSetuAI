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
import healthRoutes from './routes/health.routes.js';
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

// Parse allowed CORS origins from CLIENT_URL (supports comma-separated origins, trailing slash normalization, and scheme deduction)
const parseAllowedOrigins = () => {
  const configured = (process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const origins = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    ...configured,
  ]);

  // Ensure scheme is present for bare domains like "kaamsetuai.vercel.app"
  for (const origin of Array.from(origins)) {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      origins.add(`https://${origin}`);
      origins.add(`http://${origin}`);
    }
  }

  return origins;
};

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const allowed = parseAllowedOrigins();

    // 1. Direct match against allowed origins set
    if (allowed.has(cleanOrigin)) {
      return callback(null, true);
    }

    // 2. Allow all Vercel deployment domains (*.vercel.app) for preview branches & production
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // 3. Allow non-production environments
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Reject untrusted origin safely without triggering 500 error on preflight requests
    console.warn(`[KaamSetu AI CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
};

import crypto from 'crypto';

// Request ID tracking middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Security & Parsing Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(securitySanitizer);

// Initialize Socket.IO
initSocket(httpServer, corsOptions);

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

// Health & Readiness probes
app.use('/health', healthRoutes);

// API Routes
app.use('/api', routes);

// 404 & Centralized Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

import { pgPool } from './config/supabase.js';

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
      if (pgPool) {
        await pgPool.end();
        console.log('[KaamSetu AI] Supabase PostgreSQL connection pool closed.');
      }
      process.exit(0);
    } catch (err) {
      console.error('[KaamSetu AI] Error during database disconnect:', err.message);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const isTestRun = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_MODE) || Boolean(process.argv[1]?.includes('test'));
if (!isTestRun) {
  startServer();
}

export { app, httpServer };
export default app;

