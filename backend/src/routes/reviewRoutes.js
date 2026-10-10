import { Router } from 'express';
import {
  createReview,
  getProjectReviews,
  getWorkerReviews,
  getEmployerReviews,
  getMyReviews,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public/authenticated review view routes
router.get('/workers/:workerId/reviews', getWorkerReviews);
router.get('/employers/:employerId/reviews', getEmployerReviews);

// Protected review routes
router.use(requireAuth);

router.get('/my', getMyReviews);
router.post('/projects/:projectId/reviews', createReview);
router.get('/projects/:projectId/reviews', getProjectReviews);

export default router;
