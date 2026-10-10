import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Conversation, Message, User } from '../models/index.js';

let io = null;

export const initSocket = (httpServer, customCors) => {
  const corsConfig = customCors || {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  };

  io = new Server(httpServer, {
    cors: corsConfig,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kaamsetu-ai-secret-key-2026');
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select('-passwordHash');
      if (!user) {
        return next(new Error('Authenticated user not found'));
      }
      if (user.status !== 'active') {
        return next(new Error('Account is suspended or inactive'));
      }

      socket.user = { id: user._id.toString(), role: user.role, name: user.name };
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    console.log(`[Socket.IO] Connected User ${userId} (${socket.user.name})`);

    // Join Conversation Room after authorization check
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (
          conversation &&
          conversation.participants.some((p) => p.toString() === userId)
        ) {
          socket.join(`conversation:${conversationId}`);
          socket.emit('conversation:joined', { conversationId });
        } else {
          socket.emit('error', { message: 'Unauthorized to join conversation room' });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to join conversation room' });
      }
    });

    // Leave Conversation Room
    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId,
        userName: socket.user.name,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected User ${userId}`);
    });
  });

  return io;
};

export const getIO = () => io;
