import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID reference is required'],
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID reference is required'],
      index: true,
    },
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewee ID reference is required'],
      index: true,
    },
    reviewerRole: {
      type: String,
      enum: {
        values: ['worker', 'employer'],
        message: '{VALUE} is not a valid reviewer role',
      },
      required: [true, 'Reviewer role is required'],
    },
    revieweeRole: {
      type: String,
      enum: {
        values: ['worker', 'employer'],
        message: '{VALUE} is not a valid reviewee role',
      },
      required: [true, 'Reviewee role is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'flagged'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate reviews per project participant
reviewSchema.index({ projectId: 1, reviewerId: 1, revieweeId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
