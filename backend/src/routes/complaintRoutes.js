import { Router } from 'express';
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  cancelComplaint,
} from '../controllers/complaintController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/complaints', createComplaint);
router.get('/complaints/my', getMyComplaints);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id/cancel', cancelComplaint);

export default router;
