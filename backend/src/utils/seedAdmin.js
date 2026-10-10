import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { hashPassword } from '../services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('Connecting to Supabase for admin seeding...');
    await connectDB();

    const adminEmail = 'admin@kaamsetu.ai';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin account already exists: ${adminEmail}`);
      process.exit(0);
    }

    const passwordHash = await hashPassword('AdminPass123!');

    const admin = await User.create({
      name: 'System Admin',
      email: adminEmail,
      phone: '0000000000',
      passwordHash,
      role: 'admin',
      preferredLanguage: 'en',
      status: 'active',
      isVerified: true,
    });

    console.log('Seeded admin account successfully:', adminEmail);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error.message || error);
    process.exit(1);
  }
};

seedAdmin();
