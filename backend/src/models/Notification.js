// Supabase-backed Notification Model
import createModel from './supabaseModel.js';

const Notification = createModel('notifications', {
  userId: null,
  type: 'SYSTEM',
  title: '',
  message: '',
  translations: {},
  data: {},
  relatedEntityType: '',
  relatedEntityId: null,
  channel: 'in_app',
  isRead: false,
  readAt: null,
});

export default Notification;
