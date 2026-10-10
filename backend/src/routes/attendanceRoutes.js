import { Router } from 'express';
import {
  handleCheckIn,
  handleCheckOut,
  handleGetWorkerAttendance,
  handleGetProjectAttendance,
  handleGetAttendanceByDate,
} from '../controllers/attendanceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all attendance routes
router.use(requireAuth);

router.post('/check-in', requireRole('worker'), handleCheckIn);
router.post('/check-out', requireRole('worker'), handleCheckOut);
router.get('/my', requireRole('worker'), handleGetWorkerAttendance);
router.get('/project/:projectId', handleGetProjectAttendance);
router.get('/project/:projectId/date/:date', handleGetAttendanceByDate);

export default router;
