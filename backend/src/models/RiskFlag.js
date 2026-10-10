import mongoose from 'mongoose';

const indicatorSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const evidenceReferenceSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const reviewNoteSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      default: 'Admin',
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const riskFlagSchema = new mongoose.Schema(
  {
    subjectUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Subject user ID is required'],
      index: true,
    },
    relatedResourceType: {
      type: String,
      enum: {
        values: [
          'user',
          'worker_profile',
          'employer_profile',
          'job',
          'project',
          'attendance',
          'payment',
          'review',
          'complaint',
          'dispute',
        ],
        message: '{VALUE} is not a valid related resource type',
      },
      default: 'user',
    },
    relatedResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    riskCategory: {
      type: String,
      enum: {
        values: [
          'account_anomaly',
          'job_posting_anomaly',
          'cancellation_pattern',
          'review_pattern',
          'payment_dispute_pattern',
          'attendance_anomaly',
          'duplicate_account_indicator',
        ],
        message: '{VALUE} is not a valid risk category',
      },
      required: [true, 'Risk category is required'],
      index: true,
    },
    riskLevel: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'critical'],
        message: '{VALUE} is not a valid risk level',
      },
      required: [true, 'Risk level is required'],
      index: true,
    },
    score: {
      type: Number,
      required: [true, 'Deterministic risk score is required'],
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    indicators: {
      type: [indicatorSchema],
      default: [],
    },
    evidenceReferences: {
      type: [evidenceReferenceSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['new', 'under_review', 'false_positive', 'confirmed_issue', 'resolved', 'dismissed'],
        message: '{VALUE} is not a valid risk flag status',
      },
      default: 'new',
      index: true,
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reviewNotes: {
      type: [reviewNoteSchema],
      default: [],
    },
    resolution: {
      type: String,
      default: '',
      trim: true,
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

// Compound indexes for dashboard queries
riskFlagSchema.index({ status: 1, riskLevel: 1, createdAt: -1 });
riskFlagSchema.index({ subjectUserId: 1, riskCategory: 1, status: 1 });

export const RiskFlag = mongoose.model('RiskFlag', riskFlagSchema);
export default RiskFlag;
