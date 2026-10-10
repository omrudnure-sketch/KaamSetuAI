import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer ID reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters long'],
      maxlength: [120, 'Job title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [3000, 'Job description cannot exceed 3000 characters'],
    },
    translations: {
      type: Map,
      of: String,
      default: {},
    },
    skillRequired: {
      type: String,
      required: [true, 'Required skill is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    additionalSkills: {
      type: [String],
      default: [],
    },
    workersRequired: {
      type: Number,
      required: [true, 'Workers required count is required'],
      min: [1, 'At least 1 worker is required'],
      default: 1,
    },
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      area: {
        type: String,
        trim: true,
        default: '',
      },
      address: {
        type: String,
        trim: true,
        default: '',
      },
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
    wageType: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'fixed'],
        message: '{VALUE} is not a valid wage type',
      },
      required: [true, 'Wage type is required'],
      default: 'daily',
    },
    wageAmount: {
      type: Number,
      required: [true, 'Wage amount is required'],
      min: [0, 'Wage amount must be a positive number'],
    },
    durationType: {
      type: String,
      enum: {
        values: ['single_day', 'fixed_duration', 'until_completion'],
        message: '{VALUE} is not a valid duration type',
      },
      required: [true, 'Duration type is required'],
      default: 'single_day',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    estimatedEndDate: {
      type: Date,
      default: null,
    },
    workingHours: {
      start: { type: String, trim: true, default: '09:00' },
      end: { type: String, trim: true, default: '18:00' },
      description: { type: String, trim: true, default: '' },
    },
    requirements: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'open', 'paused', 'closed', 'cancelled', 'completed'],
        message: '{VALUE} is not a valid job status',
      },
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Secondary Indexes
jobSchema.index({ createdAt: -1 });
jobSchema.index({ 'location.coordinates': '2dsphere' });

const Job = mongoose.model('Job', jobSchema);

export default Job;
