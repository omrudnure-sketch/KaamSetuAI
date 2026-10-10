import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

router.use(requireAuth);

// Step 21 Endpoint: POST /api/ai/job-description (Employer only, Rate Limited)
router.post(
  '/job-description',
  requireRole('employer'),
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleAiJobDescription
);

// Step 22 Endpoints: AI-Powered Worker-Job Matching
router.get(
  '/matches/jobs/:jobId/workers',
  requireRole('employer'),
  aiController.getRecommendedWorkersForJob
);

router.get(
  '/matches/workers/:workerId/jobs',
  requireRole('worker'),
  aiController.getRecommendedJobsForWorker
);

// Step 23 Endpoints: Multilingual Translation
router.post(
  '/translate',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleTranslation
);

router.post(
  '/translate/jobs/:jobId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleTranslateJob
);

router.post(
  '/translate/messages/:messageId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleTranslateChatMessage
);

router.post(
  '/translate/notifications/:notificationId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleTranslateNotification
);

// Step 24 Endpoints: Natural-Language Search
router.post(
  '/search/workers',
  requireRole('employer'),
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleNaturalLanguageWorkerSearch
);

router.post(
  '/search/jobs',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleParseJobSearchQuery
);

// Step 25 Endpoints: AI-Powered Summaries
router.get(
  '/summaries/projects/:projectId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleGetProjectSummary
);

router.get(
  '/summaries/workers/:workerId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleGetWorkerSummary
);

router.get(
  '/summaries/employers/:employerId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleGetEmployerSummary
);

router.get(
  '/summaries/complaints/:complaintId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleGetComplaintSummary
);

router.get(
  '/summaries/disputes/:disputeId',
  rateLimiter({ windowMs: 60 * 1000, max: 60 }),
  aiController.handleGetDisputeSummary
);

// General AI utilities
router.post('/match-score', aiController.matchJobWorker);
router.post('/generate-job-description', requireRole('employer'), aiController.generateJobDescription);
router.post('/assistant', aiController.processAiAssistantChat);

export default router;

