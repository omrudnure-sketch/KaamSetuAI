import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/index.js';

async function testEndpoint() {
  await connectDB();
  const employer = await User.findOne({ role: 'employer', status: 'active' });
  if (!employer) {
    console.error('No active employer found in DB!');
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ userId: employer._id, role: 'employer' }, jwtSecret);

  const payload = {
    title: 'Electrician required',
    skillRequired: 'electrician',
    location: { city: 'Pune' },
    wageAmount: 800,
    wageType: 'daily',
    workersRequired: 1,
    durationType: 'single_day',
    tasks: ['Install switch board'],
    safetyRequirements: 'Insulated tools required',
  };

  try {
    const res = await fetch('http://localhost:5000/api/ai/job-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response Success:', data.success);
    if (data.data) {
      console.log('Suggested Title:', data.data.suggestedTitle);
      console.log('Description:', data.data.description);
      console.log('Responsibilities:', data.data.responsibilities);
      console.log('Safety Reminders:', data.data.safetyReminders);
    } else {
      console.log('Error:', data.error);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  } finally {
    process.exit(0);
  }
}

testEndpoint();
