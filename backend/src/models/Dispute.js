import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID reference is required'],
      index: true,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Initiator User ID reference is required'],
      index: true,
    },
    againstUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Against User ID reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['payment', 'attendance', 'work_quality', 'project_completion', 'contract_terms', 'other'],
        message: '{VALUE} is not a valid dispute type',
      },
      required: [true, 'Dispute type is required'],
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Amount cannot be negative'],
    },
    description: {
      type: String,
      required: [true, 'Dispute description is required'],
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
      enum: ['open', 'under_review', 'investigating', 'awaiting_information', 'resolved', 'rejected', 'escalated'],
      default: 'open',
      index: true,
    },
    resolution: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

disputeSchema.index({ projectId: 1, createdAt: -1 });
disputeSchema.index({ initiatedBy: 1, createdAt: -1 });
disputeSchema.index({ againstUserId: 1, createdAt: -1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
