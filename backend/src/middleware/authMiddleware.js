import { verifyToken } from '../services/authService.js';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization header as fallback
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Authentication token missing',
        },
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (_err) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Invalid or expired token',
        },
      });
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: User account no longer exists',
        },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: Account is suspended or inactive',
        },
      });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      adminRole: user.adminRole || null,
      permissions: user.permissions || [],
      preferredLanguage: user.preferredLanguage,
      status: user.status,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Access restricted to ${allowedRoles.join(', ')} roles`,
        },
      });
    }
    next();
  };
};


