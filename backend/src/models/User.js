import mongoose from 'mongoose';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      validate: {
        validator: function (val) {
          if (!val) return true;
          return emailRegex.test(val);
        },
        message: 'Invalid email address format',
      },
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ['worker', 'employer', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'worker',
    },
    adminRole: {
      type: String,
      enum: {
        values: [
          'super_admin',
          'operations_admin',
          'verification_admin',
          'finance_admin',
          'support_admin',
          'analytics_admin',
        ],
        message: '{VALUE} is not a valid admin role',
      },
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
    preferredLanguage: {
      type: String,
      enum: {
        values: ['en', 'mr', 'hi'],
        message: '{VALUE} is not a supported language',
      },
      default: 'en',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'pending', 'blocked'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create sparse unique indexes for optional unique fields email & phone
userSchema.index(
  { email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $type: 'string' } } }
);
userSchema.index(
  { phone: 1 },
  { unique: true, sparse: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

// Ensure passwordHash is omitted when converted to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
