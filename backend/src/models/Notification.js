import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'JOB_APPLICATION',
        'APPLICATION_SHORTLISTED',
        'APPLICATION_SELECTED',
        'JOB_INVITATION',
        'INVITATION_ACCEPTED',
        'HIRING_PROPOSAL',
        'HIRING_COUNTER',
        'HIRING_CONFIRMED',
        'PROJECT_STARTED',
        'ATTENDANCE',
        'PROGRESS_UPDATE',
        'EXTENSION_REQUEST',
        'EXTENSION_APPROVED',
        'EXTENSION_REJECTED',
        'PAYMENT_RECORDED',
        'PAYMENT_DISPUTED',
        'PROJECT_COMPLETED',
        'REVIEW_RECEIVED',
        'NEW_MESSAGE',
        'COMPLAINT_CREATED',
        'DISPUTE_CREATED',
        'DISPUTE_UPDATED',
        'SYSTEM',
      ],
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    translations: {
      type: Map,
      of: String,
      default: {},
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    relatedEntityType: {
      type: String,
      default: '',
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    channel: {
      type: String,
      enum: ['in_app', 'push', 'email', 'sms'],
      default: 'in_app',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
