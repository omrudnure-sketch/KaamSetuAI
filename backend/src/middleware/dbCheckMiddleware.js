// Supabase Database Readiness Middleware
import { getDbStatus } from '../config/db.js';

export const checkDbConnection = (_req, res, next) => {
  if (!getDbStatus()) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection unavailable. Please check your Supabase configuration.',
      },
    });
  }
  next();
};

export default checkDbConnection;
