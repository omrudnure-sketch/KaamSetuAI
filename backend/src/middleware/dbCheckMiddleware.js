import mongoose from 'mongoose';

export const checkDbConnection = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection unavailable. Please ensure your IP address is whitelisted on MongoDB Atlas (0.0.0.0/0 for dev) or start MongoDB.',
      },
    });
  }
  next();
};
