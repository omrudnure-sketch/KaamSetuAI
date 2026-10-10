import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  createJob,
  getEmployerJobs,
  getEmployerJobById,
  updateJob,
  closeJob,
  getAvailableJobs,
  getJobById,
} from '../controllers/jobController.js';
import { getJobsMap } from '../controllers/mapController.js';

const router = Router();

// ==========================================
// EMPLOYER SPECIFIC ROUTES
// ==========================================
// POST /api/jobs - Create job
router.post('/', requireAuth, requireRole('employer'), createJob);

// GET /api/jobs/my-jobs - Get employer's own jobs
router.get('/my-jobs', requireAuth, requireRole('employer'), getEmployerJobs);

// GET /api/jobs/my-jobs/:id - Get specific job owned by employer
router.get('/my-jobs/:id', requireAuth, requireRole('employer'), getEmployerJobById);

// PUT /api/jobs/:id - Edit own job
router.put('/:id', requireAuth, requireRole('employer'), updateJob);

// PATCH /api/jobs/:id/close - Close own job
router.patch('/:id/close', requireAuth, requireRole('employer'), closeJob);

// ==========================================
// WORKER SPECIFIC ROUTES (JOB DISCOVERY & MAP)
// ==========================================
// GET /api/jobs/map - Discover open jobs on map (must be declared before /:id)
router.get('/map', requireAuth, getJobsMap);

// GET /api/jobs - Browse available open jobs
router.get('/', requireAuth, requireRole('worker'), getAvailableJobs);

// GET /api/jobs/:id - View specific open job details
router.get('/:id', requireAuth, requireRole('worker'), getJobById);

export default router;
