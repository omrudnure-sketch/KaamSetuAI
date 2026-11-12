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

// Worker payment records
router.get('/my', requireRole('worker'), getWorkerPayments);
router.get('/payments/my', requireRole('worker'), getWorkerPayments);

// Employer payment records
router.get('/employer', requireRole('employer'), getEmployerPayments);
router.get('/payments/employer', requireRole('employer'), getEmployerPayments);

// Worker earnings summary
router.get('/earnings/my', requireRole('worker'), getWorkerEarningsSummary);
router.get('/payments/earnings/my', requireRole('worker'), getWorkerEarningsSummary);

// Project-specific payment routes
router.post('/projects/:projectId/payments', requireRole('employer'), recordPayment);
router.get('/projects/:projectId/payments', getProjectPayments);

export default router;
