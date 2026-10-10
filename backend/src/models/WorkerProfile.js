import mongoose from 'mongoose';

const workerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: null,
    },
    primarySkill: {
      type: String,
      required: [true, 'Primary skill is required'],
      trim: true,
      lowercase: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    dailyWage: {
      type: Number,
      min: [0, 'Daily wage must be a positive number'],
      default: null,
    },
    languages: {
      type: [String],
      enum: {
        values: ['en', 'mr', 'hi'],
        message: '{VALUE} is not a valid language code for workers',
      },
      default: ['en'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    location: {
      city: { type: String, trim: true, default: '' },
      area: { type: String, trim: true, default: '' },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    availability: {
      type: String,
      enum: {
        values: ['available', 'unavailable', 'busy'],
        message: '{VALUE} is not a valid availability status',
      },
      default: 'available',
    },
    preferredWorkType: {
      type: String,
      enum: {
        values: ['daily', 'multi_day', 'both'],
        message: '{VALUE} is not a valid work type preference',
      },
      default: 'both',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedProjects: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere spatial index for location coordinates
workerProfileSchema.index({ 'location.coordinates': '2dsphere' });

const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);

export default WorkerProfile;
