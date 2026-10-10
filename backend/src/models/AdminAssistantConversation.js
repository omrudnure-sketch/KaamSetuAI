import mongoose from 'mongoose';

const adminAssistantConversationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    intent: {
      type: String,
      required: true,
      trim: true,
    },
    response: {
      type: String,
      required: true,
      trim: true,
    },
    sources: {
      type: [String],
      default: [],
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    records: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

adminAssistantConversationSchema.index({ adminId: 1, createdAt: -1 });

export const AdminAssistantConversation = mongoose.model(
  'AdminAssistantConversation',
  adminAssistantConversationSchema
);
export default AdminAssistantConversation;
