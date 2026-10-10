import mongoose from 'mongoose';

export const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/kaamsetu_ai';


  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[KaamSetu AI] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[KaamSetu AI] Primary MongoDB Atlas connection failed (${error.message}). Trying local fallback...`);
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/kaamsetu_ai', { serverSelectionTimeoutMS: 3000 });
      console.log(`[KaamSetu AI] Local MongoDB Connected: ${conn.connection.host}`);
    } catch (_fallbackError) {
      console.warn('[KaamSetu AI] Warning: Unable to connect to MongoDB Atlas or local MongoDB.');
      console.warn('[KaamSetu AI] Please ensure your IP address is whitelisted on MongoDB Atlas (0.0.0.0/0 for development) or start local MongoDB.');
    }
  }
};


