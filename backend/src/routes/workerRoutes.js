import { Router } from 'express';
import {
  getWorkerProfile,
  createWorkerProfile,
  updateWorkerProfile,
  setWorkerAvailability,
  discoverWorkersForEmployer,
} from '../controllers/workerProfileController.js';
import { getWorkersMap } from '../controllers/mapController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { checkDbConnection } from '../middleware/dbCheckMiddleware.js';

const router = Router();

// GET /api/workers - Discover eligible workers for employers with area & availability filters
router.get('/', requireAuth, requireRole('employer', 'admin'), checkDbConnection, discoverWorkersForEmployer);

// GET /api/workers/map - Discover eligible workers for employers (approximate coordinates)
router.get('/map', requireAuth, requireRole('employer', 'admin'), getWorkersMap);

// Protect worker self profile endpoints: require auth & worker role
router.use(requireAuth, requireRole('worker'));

router.get('/profile', checkDbConnection, getWorkerProfile);
router.post('/profile', checkDbConnection, createWorkerProfile);
router.put('/profile', checkDbConnection, updateWorkerProfile);
router.patch('/availability', checkDbConnection, setWorkerAvailability);
router.put('/availability', checkDbConnection, setWorkerAvailability);

export default router;

