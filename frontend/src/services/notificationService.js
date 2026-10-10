import { authApiClient } from './authApi.js';

export const getNotifications = async () => {
  const response = await authApiClient.get('/notifications');
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await authApiClient.get('/notifications/unread-count');
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await authApiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await authApiClient.patch('/notifications/read-all');
  return response.data;
};
