import { Router } from 'express';
import {
  requestExtension,
  approveExtension,
  rejectExtension,
  cancelExtension,
  getProjectExtensions,
  getMyExtensionRequests,
} from '../controllers/extensionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all extension routes
router.use(requireAuth);

router.get('/my', getMyExtensionRequests);
router.patch('/:id/approve', approveExtension);
router.patch('/:id/reject', rejectExtension);
router.patch('/:id/cancel', cancelExtension);

// Project-specific extensions routes
router.post('/projects/:projectId/extensions', requestExtension);
router.get('/projects/:projectId/extensions', getProjectExtensions);

export default router;
