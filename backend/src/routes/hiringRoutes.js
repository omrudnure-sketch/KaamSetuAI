import { Router } from 'express';
import {
  handleCreateHiringAgreement,
  handleGetHiringAgreement,
  handleGetAgreementContact,
  handleGetWorkerHiringAgreements,
  handleGetEmployerHiringAgreements,
  handleAcceptHiringAgreement,
  handleRejectHiringAgreement,
  handleCounterOffer,
  handleCancelHiringAgreement,
} from '../controllers/hiringController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all hiring agreement routes
router.use(requireAuth);

router.post('/', handleCreateHiringAgreement);
router.get('/my', requireRole('worker'), handleGetWorkerHiringAgreements);
router.get('/employer', requireRole('employer'), handleGetEmployerHiringAgreements);
router.get('/:id', handleGetHiringAgreement);
router.get('/:id/contact', handleGetAgreementContact);
router.patch('/:id/accept', handleAcceptHiringAgreement);
router.patch('/:id/reject', handleRejectHiringAgreement);
router.patch('/:id/counter', handleCounterOffer);
router.patch('/:id/cancel', handleCancelHiringAgreement);

export default router;
