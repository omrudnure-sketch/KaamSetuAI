import { Router } from 'express';
import {
  handleInviteWorker,
  handleGetWorkerInvitations,
  handleGetEmployerInvitations,
  handleAcceptInvitation,
  handleRejectInvitation,
  handleCancelInvitation,
} from '../controllers/invitationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all invitation routes
router.use(requireAuth);

// Employer endpoints
router.post('/', requireRole('employer'), handleInviteWorker);
router.get('/employer', requireRole('employer'), handleGetEmployerInvitations);
router.patch('/:id/cancel', requireRole('employer'), handleCancelInvitation);

// Worker endpoints
router.get('/my', requireRole('worker'), handleGetWorkerInvitations);
router.patch('/:id/accept', requireRole('worker'), handleAcceptInvitation);
router.patch('/:id/reject', requireRole('worker'), handleRejectInvitation);

export default router;
