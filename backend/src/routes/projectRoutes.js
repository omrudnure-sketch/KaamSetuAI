import { Router } from 'express';
import {
  createProjectFromAgreement,
  getWorkerProjects,
  getEmployerProjects,
  getProjectById,
  startProject,
  requestCompletion,
  completeProject,
  cancelProject,
} from '../controllers/projectController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all project routes
router.use(requireAuth);

router.post('/from-agreement/:agreementId', createProjectFromAgreement);
router.get('/worker', requireRole('worker'), getWorkerProjects);
router.get('/employer', requireRole('employer'), getEmployerProjects);
router.get('/:id', getProjectById);
router.patch('/:id/start', startProject);
router.patch('/:id/request-completion', requestCompletion);
router.patch('/:id/complete', completeProject);
router.patch('/:id/cancel', cancelProject);

export default router;
