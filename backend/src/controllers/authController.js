import User from '../models/User.js';
import { hashPassword, comparePassword, generateAccessToken } from '../services/authService.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const register = async (req, res, next) => {
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

    const savedUser = await user.save();
    const token = generateAccessToken(savedUser);

    res.cookie('token', token, COOKIE_OPTIONS);

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
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email or phone number already exists',
        },
      });
    }
    next(error);
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
    res.cookie('token', token, COOKIE_OPTIONS);

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
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

