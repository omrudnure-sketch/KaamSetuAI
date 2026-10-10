import mongoose from 'mongoose';

const progressUpdateSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID reference is required'],
      index: true,
    },
    projectWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectWorker',
      required: [true, 'ProjectWorker ID reference is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID reference is required'],
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Progress update date string (YYYY-MM-DD) is required'],
      index: true,
    },
    percentage: {
      type: Number,
      required: [true, 'Progress percentage is required'],
      min: [0, 'Progress percentage cannot be less than 0'],
      max: [100, 'Progress percentage cannot exceed 100'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tasksCompleted: {
      type: [String],
      default: [],
    },
    blockers: {
      type: [String],
      default: [],
    },
    expectedCompletionDate: {
      type: Date,
      default: null,
    },
    photos: {
      type: [String], // Photo URLs
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to allow one daily progress update record per project-worker per day (allows updates rather than duplicates)
progressUpdateSchema.index({ projectWorkerId: 1, date: 1 }, { unique: true });

const ProgressUpdate = mongoose.model('ProgressUpdate', progressUpdateSchema);

export default ProgressUpdate;
