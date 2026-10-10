import { Router } from 'express';
import {
  createDispute,
  getMyDisputes,
  getDisputeById,
  cancelDispute,
} from '../controllers/disputeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/disputes', createDispute);
router.get('/disputes/my', getMyDisputes);
router.get('/disputes/:id', getDisputeById);
router.patch('/disputes/:id/cancel', cancelDispute);

export default router;
