import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter User ID reference is required'],
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target User ID reference is required'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: [
          'payment',
          'attendance',
          'harassment',
          'fraud',
          'job_issue',
          'worker_issue',
          'employer_issue',
          'misconduct',
          'safety',
          'other',
        ],
        message: '{VALUE} is not a valid complaint category',
      },
      required: [true, 'Complaint category is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    evidence: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['new', 'under_review', 'investigating', 'resolved', 'rejected', 'escalated'],
      default: 'new',
      index: true,
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolution: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ reporterId: 1, createdAt: -1 });
complaintSchema.index({ targetUserId: 1, createdAt: -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
