import mongoose from 'mongoose';

const jobInvitationSchema = new mongoose.Schema(
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
        values: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
        message: '{VALUE} is not a valid invitation status',
      },
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick queries on jobId and workerId
jobInvitationSchema.index({ jobId: 1, workerId: 1 });

const JobInvitation = mongoose.model('JobInvitation', jobInvitationSchema);

export default JobInvitation;
