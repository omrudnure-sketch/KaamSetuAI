import * as aiService from '../services/aiService.js';
import { generateJobDescriptionDraft } from '../services/ai/jobDescriptionService.js';
import * as matchingService from '../services/ai/matchingService.js';
import * as translationService from '../services/ai/translationService.js';
import * as nlSearchService from '../services/ai/naturalLanguageSearchService.js';
import * as summaryService from '../services/ai/summaryService.js';

// Step 25: AI-Powered Summaries Controller Handlers
export const handleGetProjectSummary = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userContext = { userId: req.user._id || req.user.id, role: req.user.role };
    const summary = await summaryService.summarizeProjectProgress(projectId, userContext);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleGetWorkerSummary = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const userContext = { userId: req.user._id || req.user.id, role: req.user.role };
    const summary = await summaryService.summarizeWorkerHistory(workerId, userContext);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleGetEmployerSummary = async (req, res, next) => {
  try {
    const { employerId } = req.params;
    const userContext = { userId: req.user._id || req.user.id, role: req.user.role };
    const summary = await summaryService.summarizeEmployerHistory(employerId, userContext);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleGetComplaintSummary = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const userContext = { userId: req.user._id || req.user.id, role: req.user.role };
    const summary = await summaryService.summarizeComplaint(complaintId, userContext);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleGetDisputeSummary = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const userContext = { userId: req.user._id || req.user.id, role: req.user.role };
    const summary = await summaryService.summarizeDispute(disputeId, userContext);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

// Step 24: Natural-Language Search Controller Handlers
export const handleNaturalLanguageWorkerSearch = async (req, res, next) => {
  try {
    const result = await nlSearchService.searchWorkersWithNaturalLanguage(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0]?.message || 'Invalid natural-language search request' },
      });
    }
    next(error);
  }
};

export const handleParseJobSearchQuery = async (req, res, next) => {
  try {
    const { query } = req.body;
    const result = await nlSearchService.parseJobSearchQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Step 23: AI Translation Controller Handlers
export const handleTranslation = async (req, res, next) => {
  try {
    const payload = {
      text: req.body.text,
      sourceLanguage: req.body.sourceLanguage || req.body.sourceLang || 'auto',
      targetLanguage: req.body.targetLanguage || req.body.targetLang || 'mr',
      contentType: req.body.contentType || 'general',
    };

    const result = await translationService.translateText(payload);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0]?.message || 'Invalid translation request' },
      });
    }
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleTranslateJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const targetLanguage = req.body.targetLanguage || req.body.targetLang || req.user?.preferredLanguage || 'mr';

    const result = await translationService.translateJobDescription(jobId, targetLanguage);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleTranslateChatMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const targetLanguage = req.body.targetLanguage || req.body.targetLang || 'en';

    const result = await translationService.translateChatMessage(messageId, targetLanguage, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const handleTranslateNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const targetLanguage = req.body.targetLanguage || req.body.targetLang || req.user?.preferredLanguage || 'mr';

    const result = await translationService.translateNotificationText(notificationId, targetLanguage, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};


export const getRecommendedWorkersForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { page, limit, minScore } = req.query;

    const result = await matchingService.recommendWorkersForJob(jobId, req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      minScore: minScore ? parseInt(minScore, 10) : 30,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const getRecommendedJobsForWorker = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { page, limit, minScore } = req.query;

    if (workerId !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized: You can only view job recommendations for yourself' },
      });
    }

    const result = await matchingService.recommendJobsForWorker(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      minScore: minScore ? parseInt(minScore, 10) : 30,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
};

export const translateMessage = async (req, res, next) => {
  try {
    const { text, targetLang } = req.body;
    const result = await aiService.translateMessage(text, targetLang);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const matchJobWorker = async (req, res, next) => {
  try {
    const { job, workerProfile } = req.body;
    const result = aiService.matchJobWorker(job, workerProfile);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const generateJobDescription = async (req, res, next) => {
  try {
    const draft = await generateJobDescriptionDraft(req.body);
    res.json({ success: true, data: draft });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid input for job description generation',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};

export const handleAiJobDescription = async (req, res, next) => {
  try {
    const draft = await generateJobDescriptionDraft(req.body);
    res.json({ success: true, data: draft });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid input for job description generation',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};

export const processAiAssistantChat = async (req, res, next) => {
  try {
    const { prompt, lang } = req.body;
    const role = req.user ? req.user.role : 'worker';
    const result = await aiService.processAiAssistantChat({ prompt, role, lang });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
