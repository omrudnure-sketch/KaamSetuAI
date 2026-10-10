// Rate Limiting Middleware using sliding window / token bucket per IP

export const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 500, message = 'Too many requests from this IP. Please try again later.' } = {}) => {
  // Each middleware instance maintains its own isolated counter store
  const store = new Map();

  return (req, res, next) => {
    // Robust IP extraction taking first IP if behind reverse proxy
    let ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    if (typeof ip === 'string' && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    const now = Date.now();

    if (!store.has(ip)) {
      store.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = store.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: { message },
      });
    }

    next();
  };
};

// Sensitive endpoints rate limiter (Login, Register, Password updates)
export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

export default rateLimiter;

