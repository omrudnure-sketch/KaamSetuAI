import { Router } from 'express';
import {
  getWorkerProfile,
  createWorkerProfile,
  updateWorkerProfile,
} from '../controllers/workerProfileController.js';
import { getWorkersMap } from '../controllers/mapController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { checkDbConnection } from '../middleware/dbCheckMiddleware.js';

const router = Router();

// GET /api/workers/map - Discover eligible workers for employers (approximate coordinates)
router.get('/map', requireAuth, requireRole('employer'), getWorkersMap);

// Protect worker self profile endpoints: require auth & worker role
router.use(requireAuth, requireRole('worker'));

router.get('/profile', checkDbConnection, getWorkerProfile);
router.post('/profile', checkDbConnection, createWorkerProfile);
router.put('/profile', checkDbConnection, updateWorkerProfile);

export default router;
