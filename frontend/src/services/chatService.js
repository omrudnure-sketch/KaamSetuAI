import { authApiClient } from './authApi.js';

// Legacy / Direct Conversation
export const createConversation = async (data) => {
  const response = await authApiClient.post('/conversations', data);
  return response.data;
};

// Send Pre-Agreement Chat Request (Worker to Employer or Employer to Worker)
export const sendChatRequest = async (data) => {
  const response = await authApiClient.post('/conversations/request', data);
  return response.data;
};

// Respond to Chat Request (accept or reject)
export const respondToChatRequest = async (conversationId, action) => {
  const response = await authApiClient.post(`/conversations/${conversationId}/respond`, { action });
  return response.data;
};

// Get Pending Chat Requests (incoming & outgoing)
export const getPendingRequests = async () => {
  const response = await authApiClient.get('/conversations/requests');
  return response.data;
};

// Get All Conversations for current user
export const getMyConversations = async () => {
  const response = await authApiClient.get('/conversations');
  return response.data;
};

// Get single conversation details
export const getConversation = async (id) => {
  const response = await authApiClient.get(`/conversations/${id}`);
  return response.data;
};

// Get messages for conversation
export const getMessages = async (conversationId) => {
  const response = await authApiClient.get(`/conversations/${conversationId}/messages`);
  return response.data;
};

// Send message (text, image, audio)
export const sendMessage = async (conversationId, data) => {
  const response = await authApiClient.post(`/conversations/${conversationId}/messages`, data);
  return response.data;
};

// Mark message as read
export const markMessageRead = async (messageId) => {
  const response = await authApiClient.patch(`/messages/${messageId}/read`);
  return response.data;
};

// Upload Chat Image (Multipart Form Data)
export const uploadChatImage = async (conversationId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await authApiClient.post(`/conversations/${conversationId}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Upload Chat Audio Note (Multipart Form Data)
export const uploadChatAudio = async (conversationId, audioBlob, duration = 0) => {
  const formData = new FormData();
  const ext = audioBlob.type?.includes('ogg') ? 'ogg' : audioBlob.type?.includes('mp3') ? 'mp3' : 'webm';
  formData.append('audio', audioBlob, `voice-note-${Date.now()}.${ext}`);
  formData.append('duration', Math.round(duration));
  const response = await authApiClient.post(`/conversations/${conversationId}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
