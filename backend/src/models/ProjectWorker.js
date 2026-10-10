import mongoose from 'mongoose';

const projectWorkerSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID reference is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID reference is required'],
      index: true,
    },
    hiringAgreementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HiringAgreement',
      required: [true, 'HiringAgreement reference is required'],
    },
    agreedWage: {
      type: Number,
      required: [true, 'Agreed wage is required'],
      min: [1, 'Wage must be greater than 0'],
    },
    wageType: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'fixed'],
        message: '{VALUE} is not a valid wage type',
      },
      required: [true, 'Wage type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    expectedEndDate: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      default: 'worker',
    },
    status: {
      type: String,
      enum: {
        values: ['confirmed', 'active', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid project worker status',
      },
      default: 'confirmed',
      index: true,
    },
    workerAccepted: {
      type: Boolean,
      default: true,
    },
    employerAccepted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup and uniqueness per project-worker association
projectWorkerSchema.index({ projectId: 1, workerId: 1 }, { unique: true });

const ProjectWorker = mongoose.model('ProjectWorker', projectWorkerSchema);

export default ProjectWorker;
