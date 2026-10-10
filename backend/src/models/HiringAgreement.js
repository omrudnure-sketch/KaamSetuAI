import mongoose from 'mongoose';

const offerHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    proposedBy: {
      type: String,
      enum: ['worker', 'employer'],
      required: true,
    },
    wage: {
      type: Number,
      required: true,
      min: [1, 'Wage must be greater than 0'],
    },
    wageType: {
      type: String,
      enum: ['daily', 'weekly', 'fixed'],
      required: true,
    },
    durationType: {
      type: String,
      enum: ['single_day', 'fixed_duration', 'until_completion'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    estimatedEndDate: {
      type: Date,
      default: null,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      description: { type: String, default: '' },
    },
    message: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const hiringAgreementSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID reference is required'],
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer ID reference is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID reference is required'],
      index: true,
    },
    sourceType: {
      type: String,
      enum: {
        values: ['application', 'invitation'],
        message: '{VALUE} is not a valid agreement source type',
      },
      required: [true, 'Source type is required'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Source ID reference is required'],
      index: true,
    },
    durationType: {
      type: String,
      enum: {
        values: ['single_day', 'fixed_duration', 'until_completion'],
        message: '{VALUE} is not a valid duration type',
      },
      required: [true, 'Duration type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    estimatedEndDate: {
      type: Date,
      default: null,
    },
    wageType: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'fixed'],
        message: '{VALUE} is not a valid wage type',
      },
      required: [true, 'Wage type is required'],
    },
    proposedWage: {
      type: Number,
      required: [true, 'Proposed wage is required'],
      min: [1, 'Proposed wage must be greater than 0'],
    },
    agreedWage: {
      type: Number,
      default: null,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      description: { type: String, default: '' },
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: [
          'draft',
          'pending_worker',
          'pending_employer',
          'negotiation',
          'confirmed',
          'rejected',
          'cancelled',
          'expired',
        ],
        message: '{VALUE} is not a valid hiring agreement status',
      },
      default: 'pending_worker',
      index: true,
    },
    employerAccepted: {
      type: Boolean,
      default: false,
    },
    workerAccepted: {
      type: Boolean,
      default: false,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    offerHistory: {
      type: [offerHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

hiringAgreementSchema.index({ jobId: 1, workerId: 1 });
hiringAgreementSchema.index({ sourceType: 1, sourceId: 1 });

const HiringAgreement = mongoose.model('HiringAgreement', hiringAgreementSchema);

export default HiringAgreement;
