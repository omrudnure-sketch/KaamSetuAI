import { authApiClient } from './authApi.js';

export const translateText = async ({ text, sourceLanguage = 'auto', targetLanguage = 'mr', contentType = 'general' }) => {
  const response = await authApiClient.post('/ai/translate', {
    text,
    sourceLanguage,
    targetLanguage,
    contentType,
  });
  return response.data;
};

export const translateMessage = async (text, targetLang = 'mr') => {
  return translateText({ text, targetLanguage: targetLang, contentType: 'message' });
};

export const translateJobDescription = async (jobId, targetLanguage = 'mr') => {
  const response = await authApiClient.post(`/ai/translate/jobs/${jobId}`, { targetLanguage });
  return response.data;
};

export const translateChatMessage = async (messageId, targetLanguage = 'en') => {
  const response = await authApiClient.post(`/ai/translate/messages/${messageId}`, { targetLanguage });
  return response.data;
};

export const translateNotification = async (notificationId, targetLanguage = 'mr') => {
  const response = await authApiClient.post(`/ai/translate/notifications/${notificationId}`, { targetLanguage });
  return response.data;
};

export const getMatchScore = async (job, workerProfile) => {
  const response = await authApiClient.post('/ai/match-score', { job, workerProfile });
  return response.data;
};

export const generateJobDescription = async (jobData) => {
  const response = await authApiClient.post('/ai/generate-job-description', jobData);
  return response.data;
};

export const askAiAssistant = async (prompt, lang = 'en') => {
  const response = await authApiClient.post('/ai/assistant', { prompt, lang });
  return response.data;
};

// Step 22: AI-Powered Matching APIs
export const getRecommendedWorkersForJob = async (jobId, params = {}) => {
  const response = await authApiClient.get(`/ai/matches/jobs/${jobId}/workers`, { params });
  return response.data;
};

export const getRecommendedJobsForWorker = async (workerId, params = {}) => {
  const response = await authApiClient.get(`/ai/matches/workers/${workerId}/jobs`, { params });
  return response.data;
};

// Step 24: Natural-Language Search APIs
export const searchWorkersWithNL = async (payload) => {
  const response = await authApiClient.post('/ai/search/workers', payload);
  return response.data;
};

export const parseJobSearchNL = async (query) => {
  const response = await authApiClient.post('/ai/search/jobs', { query });
  return response.data;
};

// Step 25: AI-Powered Summaries APIs
export const getProjectSummary = async (projectId) => {
  const response = await authApiClient.get(`/ai/summaries/projects/${projectId}`);
  return response.data;
};

export const getWorkerSummary = async (workerId) => {
  const response = await authApiClient.get(`/ai/summaries/workers/${workerId}`);
  return response.data;
};

export const getEmployerSummary = async (employerId) => {
  const response = await authApiClient.get(`/ai/summaries/employers/${employerId}`);
  return response.data;
};

export const getComplaintSummary = async (complaintId) => {
  const response = await authApiClient.get(`/ai/summaries/complaints/${complaintId}`);
  return response.data;
};

export const getDisputeSummary = async (disputeId) => {
  const response = await authApiClient.get(`/ai/summaries/disputes/${disputeId}`);
  return response.data;
};

