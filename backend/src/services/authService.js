import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

// Resolve JWT secret; enforce explicit configuration in production mode
const getJwtSecret = () => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[KaamSetu AI Security] Critical error: JWT_SECRET environment variable is missing in production environment');
  }
  return 'kaamsetu-ai-development-fallback-secret-2026-min-32-chars-long';
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, passwordHash) => {
  return await bcrypt.compare(password, passwordHash);
};

export const generateAccessToken = (user) => {
  const secret = getJwtSecret();
  const userId = user._id ? user._id.toString() : user.id;

  const payload = {
    userId,
    role: user.role,
  };

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const generateToken = generateAccessToken;

export const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

