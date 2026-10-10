import { Router } from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { checkDbConnection } from '../middleware/dbCheckMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public routes with dedicated brute-force rate limiter & DB connection check
router.post('/register', authLimiter, checkDbConnection, register);
router.post('/login', authLimiter, checkDbConnection, login);

// Protected routes
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);

// Development test routes (disabled in production environment)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', requireAuth, (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Authentication is working',
      user: {
        id: req.user.id,
        role: req.user.role,
      },
    });
  });

  router.get('/worker-only', requireAuth, requireRole('worker'), (req, res) => {
    res.status(200).json({ success: true, message: 'Worker access granted', user: req.user });
  });

  router.get('/employer-only', requireAuth, requireRole('employer'), (req, res) => {
    res.status(200).json({ success: true, message: 'Employer access granted', user: req.user });
  });

  router.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
    res.status(200).json({ success: true, message: 'Admin access granted', user: req.user });
  });
}

export default router;


