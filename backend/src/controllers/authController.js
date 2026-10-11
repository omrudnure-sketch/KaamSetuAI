import User from '../models/User.js';
import WorkerProfile from '../models/WorkerProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import { hashPassword, comparePassword, generateAccessToken } from '../services/authService.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

export const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const register = async (req, res, next) => {
  let savedUser = null;
  try {
    const validation = validateRegister(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const { name, email, phone, password, role, preferredLanguage } = validation.data;

    // Check for existing account with same email or phone
    if (email && email.trim() !== '') {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'An account with this email address already exists',
          },
        });
      }
    }

    if (phone && phone.trim() !== '') {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'An account with this phone number already exists',
          },
        });
      }
    }

    const passwordHash = await hashPassword(password);

    const user = new User({
      name,
      email: email && email.trim() !== '' ? email.trim().toLowerCase() : null,
      phone: phone && phone.trim() !== '' ? phone.trim() : null,
      passwordHash,
      role,
      preferredLanguage: role === 'employer' ? 'en' : preferredLanguage || 'en',
      status: 'active',
      isVerified: false,
    });

    savedUser = await user.save();

    // Auto-create initial profile for the registered user with verified Supabase columns
    try {
      if (savedUser.role === 'worker') {
        const existingProfile = await WorkerProfile.findOne({ userId: savedUser._id });
        if (!existingProfile) {
          await WorkerProfile.create({
            userId: savedUser._id,
            bio: '',
            skills: [],
            availability: 'available',
            profileCompletion: 20,
          });
        }
      } else if (savedUser.role === 'employer') {
        const existingProfile = await EmployerProfile.findOne({ userId: savedUser._id });
        if (!existingProfile) {
          await EmployerProfile.create({
            userId: savedUser._id,
            companyName: savedUser.name || '',
            contactPerson: savedUser.name || '',
            profileCompletion: 30,
          });
        }
      }
    } catch (profileErr) {
      console.warn('[KaamSetu AI] Initial profile initialization notice:', profileErr.message);
    }

    let token;
    try {
      token = generateAccessToken(savedUser);
    } catch (tokenErr) {
      // Rollback user immediately if token generation fails
      console.error('[KaamSetu AI] Token generation failed during registration, rolling back user record:', tokenErr.message);
      if (savedUser?._id) {
        await User.findByIdAndDelete(savedUser._id);
        savedUser = null;
      }
      throw tokenErr;
    }

    res.cookie('token', token, getCookieOptions());

    const safeUserData = {
      id: savedUser._id.toString(),
      name: savedUser.name,
      email: savedUser.email,
      phone: savedUser.phone,
      role: savedUser.role,
      preferredLanguage: savedUser.preferredLanguage,
      status: savedUser.status,
      isVerified: savedUser.isVerified,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: {
        user: safeUserData,
        token,
      },
    });
  } catch (error) {
    // If registration failed after user record was inserted, roll back the newly created user to prevent orphaned records
    if (savedUser?._id) {
      try {
        await User.findByIdAndDelete(savedUser._id);
        console.warn(`[KaamSetu AI] Rolled back orphaned user record: ${savedUser._id}`);
      } catch (rollbackErr) {
        console.error('[KaamSetu AI] Failed to rollback orphaned user record:', rollbackErr.message);
      }
    }

    // 11000 = MongoDB duplicate key, 23505 = PostgreSQL / Supabase unique constraint violation
    if (error.code === 11000 || error.code === '23505' || String(error.code) === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email or phone number already exists',
        },
      });
    }

    // Safe diagnostic log without leaking credentials or tokens
    console.error('[KaamSetu AI Registration Error]:', error.message || error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Registration could not be completed. Please try again.',
      },
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const { email, password } = validation.data;
    const identifier = email.trim();

    // Search user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is suspended. Suspended users are not allowed to log in.',
        },
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateAccessToken(user);
    res.cookie('token', token, getCookieOptions());

    const safeUserData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      status: user.status,
      isVerified: user.isVerified,
    };

    res.status(200).json({
      success: true,
      data: {
        user: safeUserData,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      preferredLanguage: req.user.preferredLanguage,
      status: req.user.status,
      isVerified: req.user.isVerified,
    },
  });
};

export const logout = async (_req, res) => {
  const cookieOpts = getCookieOptions();
  res.clearCookie('token', {
    httpOnly: cookieOpts.httpOnly,
    sameSite: cookieOpts.sameSite,
    secure: cookieOpts.secure,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

