import { Router } from 'express';
import {
  handleCreateOrUpdateProgress,
  handleGetProjectProgress,
  handleGetWorkerProgress,
  handleGetProgressByDate,
} from '../controllers/progressController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all progress routes
router.use(requireAuth);

router.post('/projects/:projectId', requireRole('worker'), handleCreateOrUpdateProgress);
router.get('/projects/:projectId', handleGetProjectProgress);
router.get('/my', requireRole('worker'), handleGetWorkerProgress);
router.get('/projects/:projectId/date/:date', handleGetProgressByDate);

export default router;
