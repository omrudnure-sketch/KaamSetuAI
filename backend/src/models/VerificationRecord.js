import mongoose from 'mongoose';

const verificationRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verificationType: {
      type: String,
      enum: ['identity', 'skill', 'business', 'address'],
      required: true,
    },
    documents: [
      {
        docType: { type: String, required: true },
        docUrl: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected', 'needs_correction'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

verificationRecordSchema.index({ userId: 1, status: 1 });
verificationRecordSchema.index({ status: 1, createdAt: -1 });

export const VerificationRecord = mongoose.model('VerificationRecord', verificationRecordSchema);
export default VerificationRecord;
