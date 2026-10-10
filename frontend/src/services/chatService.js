import { authApiClient } from './authApi.js';

export const createConversation = async (data) => {
  const response = await authApiClient.post('/conversations', data);
  return response.data;
};

export const getMyConversations = async () => {
  const response = await authApiClient.get('/conversations');
  return response.data;
};

export const getConversation = async (id) => {
  const response = await authApiClient.get(`/conversations/${id}`);
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await authApiClient.get(`/conversations/${conversationId}/messages`);
  return response.data;
};

export const sendMessage = async (conversationId, data) => {
  const response = await authApiClient.post(`/conversations/${conversationId}/messages`, data);
  return response.data;
};

export const markMessageRead = async (messageId) => {
  const response = await authApiClient.patch(`/messages/${messageId}/read`);
  return response.data;
};
