import mongoose from 'mongoose';

export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'KaamSetu AI API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

export const getReadinessStatus = (req, res) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
    });
  }

  return res.status(503).json({
    success: false,
    status: 'unready',
    timestamp: new Date().toISOString(),
    services: {
      database: 'disconnected',
    },
  });
};
