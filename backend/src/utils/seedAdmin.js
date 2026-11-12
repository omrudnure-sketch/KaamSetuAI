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

export const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@kaamsetu.ai';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      return existingAdmin;
    }

    const passwordHash = await hashPassword('AdminPass123!');

    const admin = await User.create({
      name: 'System Admin',
      email: adminEmail,
      phone: '0000000000',
      passwordHash,
      role: 'admin',
      adminRole: 'super_admin',
      preferredLanguage: 'en',
      status: 'active',
      isVerified: true,
    });

    console.log('[KaamSetu AI] Default admin account ensured:', adminEmail);
    return admin;
  } catch (error) {
    console.warn('[KaamSetu AI] Notice ensuring default admin user:', error.message || error);
    return null;
  }
};

const runStandalone = async () => {
  try {
    console.log('Connecting to database for admin seeding...');
    await connectDB();
    await ensureDefaultAdmin();
    console.log('Admin seeding process complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error in standalone admin seeding:', err);
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].includes('seedAdmin')) {
  runStandalone();
}

export default ensureDefaultAdmin;
