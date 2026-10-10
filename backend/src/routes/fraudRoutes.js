import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import * as fraudService from '../services/fraudService.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/flagged-users', async (req, res, next) => {
  try {
    const flagged = await fraudService.getFlaggedFraudUsers();
    res.json({ success: true, data: flagged });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:id', async (req, res, next) => {
  try {
    const assessment = await fraudService.analyzeUserFraudRisk(req.params.id);
    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
});

export default router;
