import { Router } from 'express';
import {
  getEmployerProfile,
  createEmployerProfile,
  updateEmployerProfile,
} from '../controllers/employerProfileController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { checkDbConnection } from '../middleware/dbCheckMiddleware.js';

const router = Router();

// Protect all employer profile endpoints: require auth & employer role
router.use(requireAuth, requireRole('employer'));

router.get('/profile', checkDbConnection, getEmployerProfile);
router.post('/profile', checkDbConnection, createEmployerProfile);
router.put('/profile', checkDbConnection, updateEmployerProfile);

export default router;
