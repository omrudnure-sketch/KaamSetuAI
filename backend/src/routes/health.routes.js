import { Router } from 'express';
import { getHealthStatus, getReadinessStatus } from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealthStatus);
router.get('/health', getHealthStatus);
router.get('/ready', getReadinessStatus);
router.get('/health/ready', getReadinessStatus);

export default router;
