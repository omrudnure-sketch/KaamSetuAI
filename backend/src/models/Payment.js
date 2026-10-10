import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
      required: [true, 'Project worker ID reference is required'],
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
    type: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'milestone', 'final', 'adjustment'],
        message: '{VALUE} is not a valid payment type',
      },
      required: [true, 'Payment type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'recorded', 'disputed', 'cancelled'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'recorded',
      index: true,
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'other'],
      default: 'cash',
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by User ID reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
paymentSchema.index({ projectId: 1, paymentDate: -1 });
paymentSchema.index({ projectWorkerId: 1, paymentDate: -1 });
paymentSchema.index({ workerId: 1, paymentDate: -1 });
paymentSchema.index({ employerId: 1, paymentDate: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
