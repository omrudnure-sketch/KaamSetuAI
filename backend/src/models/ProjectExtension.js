import mongoose from 'mongoose';

const projectExtensionSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester User ID is required'],
      index: true,
    },
    requestType: {
      type: String,
      enum: {
        values: ['duration_extension', 'term_change'],
        message: '{VALUE} is not a valid request type',
      },
      default: 'duration_extension',
    },
    previousEndDate: {
      type: Date,
      required: [true, 'Previous end date is required'],
    },
    requestedEndDate: {
      type: Date,
      required: [true, 'Requested end date is required'],
    },
    previousWage: {
      type: Number,
      default: null,
    },
    proposedWage: {
      type: Number,
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters long'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    workerApproval: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    employerApproval: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
        message: '{VALUE} is not a valid extension status',
      },
      default: 'pending',
      index: true,
    },
    effectiveAt: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectExtensionSchema.index({ projectId: 1, status: 1 });
projectExtensionSchema.index({ projectWorkerId: 1, status: 1 });

const ProjectExtension = mongoose.model('ProjectExtension', projectExtensionSchema);

export default ProjectExtension;
