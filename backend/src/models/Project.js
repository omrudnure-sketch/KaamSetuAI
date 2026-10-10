import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
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
    createdFromHiringAgreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HiringAgreement',
      required: [true, 'Source HiringAgreement reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    projectType: {
      type: String,
      enum: {
        values: ['single_day', 'fixed_duration', 'until_completion'],
        message: '{VALUE} is not a valid project type',
      },
      default: 'fixed_duration',
    },
    location: {
      city: { type: String, trim: true, default: '' },
      area: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
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
      index: true,
    },
    originalEstimatedEndDate: {
      type: Date,
      default: null,
    },
    currentExpectedEndDate: {
      type: Date,
      default: null,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      description: { type: String, default: '' },
    },
    paymentType: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'fixed'],
        message: '{VALUE} is not a valid payment type',
      },
      required: [true, 'Payment type is required'],
    },
    paymentAmount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    workersRequired: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 worker is required'],
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Progress percentage cannot be less than 0'],
      max: [100, 'Progress percentage cannot exceed 100'],
    },
    status: {
      type: String,
      enum: {
        values: ['confirmed', 'in_progress', 'completion_requested', 'completed', 'closed', 'cancelled', 'disputed'],
        message: '{VALUE} is not a valid project status',
      },
      default: 'confirmed',
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ employerId: 1, status: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
