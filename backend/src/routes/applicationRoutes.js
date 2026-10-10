import { Router } from 'express';
import {
  handleApplyToJob,
  handleGetWorkerApplications,
  handleGetEmployerApplications,
  handleShortlistApplication,
  handleSelectApplication,
  handleRejectApplication,
  handleWithdrawApplication,
} from '../controllers/applicationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all application routes
router.use(requireAuth);

// Worker endpoints
router.post('/jobs/:jobId', requireRole('worker'), handleApplyToJob);
router.get('/my', requireRole('worker'), handleGetWorkerApplications);
router.patch('/:id/withdraw', requireRole('worker'), handleWithdrawApplication);

// Employer endpoints
router.get('/employer', requireRole('employer'), handleGetEmployerApplications);
router.patch('/:id/shortlist', requireRole('employer'), handleShortlistApplication);
router.patch('/:id/select', requireRole('employer'), handleSelectApplication);
router.patch('/:id/reject', requireRole('employer'), handleRejectApplication);

export default router;
