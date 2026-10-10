import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { hashPassword } from '../services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();


const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaamsetu_ai';
    if (!mongoUri) {
      console.error('MONGO_URI is missing from environment.');
      process.exit(1);
    }

    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB Atlas for seeding...');
    } catch (err) {
      console.warn('Atlas connection failed. Trying local MongoDB fallback...');
      try {
        await mongoose.connect('mongodb://127.0.0.1:27017/kaamsetu_ai', { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to local MongoDB for seeding...');
      } catch (fallbackErr) {
        console.error('Error seeding admin user: Unable to connect to MongoDB Atlas or local MongoDB.');
        console.error('Please whitelist your current IP address on MongoDB Atlas (0.0.0.0/0 for dev) or start a local MongoDB service.');
        process.exit(1);
      }
    }



    const adminEmail = 'admin@kaamsetu.ai';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin account already exists: ${adminEmail}`);
      await mongoose.disconnect();
      return;
    }

    const passwordHash = await hashPassword('AdminPass123!');

    const admin = new User({
      name: 'System Admin',
      email: adminEmail,
      phone: '0000000000',
      passwordHash,
      role: 'admin',
      preferredLanguage: 'en',
      status: 'active',
      isVerified: true,
    });

    await admin.save();
    console.log('Seeded development admin account successfully:', adminEmail);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
