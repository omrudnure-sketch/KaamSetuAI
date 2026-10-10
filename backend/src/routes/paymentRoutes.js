import { Router } from 'express';
import {
  recordPayment,
  getProjectPayments,
  getWorkerPayments,
  getEmployerPayments,
  getWorkerEarningsSummary,
} from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all payment routes
router.use(requireAuth);

router.get('/my', requireRole('worker'), getWorkerPayments);
router.get('/employer', requireRole('employer'), getEmployerPayments);
router.get('/earnings/my', requireRole('worker'), getWorkerEarningsSummary);

// Project-specific payment routes
router.post('/projects/:projectId/payments', requireRole('employer'), recordPayment);
router.get('/projects/:projectId/payments', getProjectPayments);

export default router;
