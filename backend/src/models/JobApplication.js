import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID reference is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID reference is required'],
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer ID reference is required'],
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    proposedWage: {
      type: Number,
      required: [true, 'Proposed wage is required'],
      min: [1, 'Proposed wage must be greater than 0'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'shortlisted', 'selected', 'rejected', 'withdrawn'],
        message: '{VALUE} is not a valid application status',
      },
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications for the same job by the same worker
jobApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;
