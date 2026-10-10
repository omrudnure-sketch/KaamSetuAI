import User from '../models/User.js';
import { validateCreateUser } from '../validators/userValidator.js';

export const createUser = async (req, res, next) => {
  try {
    const validation = validateCreateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Validation error: ${validation.error}`,
        },
      });
    }

    const { name, email, phone, role, preferredLanguage } = validation.data;

    const userData = {
      name,
      role,
      preferredLanguage,
    };

    if (email && email.trim() !== '') {
      userData.email = email.trim().toLowerCase();
    }

    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }

    // Check for existing duplicate email or phone before attempting save
    if (userData.email) {
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'User with this email already exists',
          },
        });
      }
    }

    if (userData.phone) {
      const existingPhone = await User.findOne({ phone: userData.phone });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'User with this phone number already exists',
          },
        });
      }
    }

    const user = new User(userData);
    const savedUser = await user.save();

    res.status(201).json({
      success: true,
      data: savedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'email or phone';
      return res.status(409).json({
        success: false,
        error: {
          message: `User with this ${field} already exists`,
        },
      });
    }
    next(error);
  }
};

export const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
