import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, passwordHash) => {
  return await bcrypt.compare(password, passwordHash);
};

export const generateAccessToken = (user) => {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'kaamsetu-ai-dev-secret-key-32chars-min' : null);
  if (!secret) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  const userId = user._id ? user._id.toString() : user.id;

  const payload = {
    userId,
    role: user.role,
  };

  return jwt.sign(payload, secret, {
    expiresIn: '15m',
  });
};

export const generateToken = generateAccessToken;

export const verifyToken = (token) => {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'kaamsetu-ai-dev-secret-key-32chars-min' : null);
  if (!secret) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }
  return jwt.verify(token, secret);
};

