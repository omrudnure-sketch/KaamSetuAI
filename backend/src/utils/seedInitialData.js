import User from '../models/User.js';
import WorkerProfile from '../models/WorkerProfile.js';
import EmployerProfile from '../models/EmployerProfile.js';
import Job from '../models/Job.js';
import { hashPassword } from '../services/authService.js';

/**
 * Seed initial sample workers and jobs if the platform has no worker accounts.
 * Ensures the platform is immediately useful for demonstration and development.
 */
export const seedInitialDemoData = async () => {
  try {
    const existingWorkers = await User.find({ role: 'worker' });
    if (existingWorkers && existingWorkers.length > 0) {
      return;
    }

    console.log('[KaamSetu AI] Seeding initial active demo workers and jobs...');

    const defaultPasswordHash = await hashPassword('WorkerPass123!');

    // 1. Worker: Rajesh Kumar (Electrician in Pune, ready for work)
    const rajesh = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh.worker@kaamsetu.ai',
      phone: '9876543210',
      passwordHash: defaultPasswordHash,
      role: 'worker',
      preferredLanguage: 'mr',
      status: 'active',
      isVerified: true,
    });

    await WorkerProfile.create({
      userId: rajesh._id || rajesh.id,
      fullName: 'Rajesh Kumar',
      bio: 'Experienced licensed residential and commercial electrician with 6+ years in home wiring, fuse box repairs, and solar panel setups.',
      primarySkill: 'Electrician',
      skills: ['Electrician', 'Wiring', 'Solar Installation', 'Appliance Repair'],
      experienceYears: 6,
      dailyWage: 800,
      hourlyRate: 120,
      languages: ['Marathi', 'Hindi', 'English'],
      preferredWorkType: 'daily',
      availability: 'available',
      isAvailableForWork: true,
      serviceRadiusKm: 25,
      city: 'Pune',
      area: 'Kothrud',
      location: 'Kothrud, Pune',
      latitude: 18.5074,
      longitude: 73.8077,
      rating: 4.8,
      reviewCount: 14,
      completedProjects: 22,
      profileCompletion: 90,
    });

    // 2. Worker: Suresh Patil (Mason in Pune, ready for work)
    const suresh = await User.create({
      name: 'Suresh Patil',
      email: 'suresh.worker@kaamsetu.ai',
      phone: '9876543211',
      passwordHash: defaultPasswordHash,
      role: 'worker',
      preferredLanguage: 'mr',
      status: 'active',
      isVerified: true,
    });

    await WorkerProfile.create({
      userId: suresh._id || suresh.id,
      fullName: 'Suresh Patil',
      bio: 'Master brick mason and plaster specialist with 8 years of on-site construction experience in building renovations and concrete work.',
      primarySkill: 'Mason',
      skills: ['Mason', 'Bricklayer', 'Plastering', 'Concrete'],
      experienceYears: 8,
      dailyWage: 850,
      hourlyRate: 130,
      languages: ['Marathi', 'Hindi'],
      preferredWorkType: 'project',
      availability: 'available',
      isAvailableForWork: true,
      serviceRadiusKm: 30,
      city: 'Pune',
      area: 'Hadapsar',
      location: 'Hadapsar, Pune',
      latitude: 18.5089,
      longitude: 73.9259,
      rating: 4.9,
      reviewCount: 19,
      completedProjects: 31,
      profileCompletion: 85,
    });

    // 3. Worker: Amit Shinde (Plumber in Mumbai, ready for work)
    const amit = await User.create({
      name: 'Amit Shinde',
      email: 'amit.worker@kaamsetu.ai',
      phone: '9876543212',
      passwordHash: defaultPasswordHash,
      role: 'worker',
      preferredLanguage: 'en',
      status: 'active',
      isVerified: true,
    });

    await WorkerProfile.create({
      userId: amit._id || amit.id,
      fullName: 'Amit Shinde',
      bio: 'Certified plumber specializing in pipeline fitting, leak detection, drainage systems, and bathroom fixture installation.',
      primarySkill: 'Plumber',
      skills: ['Plumber', 'Pipe Fitting', 'Sanitary', 'Water Tank'],
      experienceYears: 5,
      dailyWage: 750,
      hourlyRate: 110,
      languages: ['Marathi', 'Hindi', 'English'],
      preferredWorkType: 'daily',
      availability: 'available',
      isAvailableForWork: true,
      serviceRadiusKm: 20,
      city: 'Mumbai',
      area: 'Dadar',
      location: 'Dadar, Mumbai',
      latitude: 19.0178,
      longitude: 72.8478,
      rating: 4.7,
      reviewCount: 9,
      completedProjects: 15,
      profileCompletion: 80,
    });

    // 4. Default Employer & Sample Open Job
    const existingEmployers = await User.find({ role: 'employer' });
    let employerUser = existingEmployers?.[0];

    if (!employerUser) {
      const employerPasswordHash = await hashPassword('EmployerPass123!');
      employerUser = await User.create({
        name: 'Patil Builders & Contractors',
        email: 'employer@kaamsetu.ai',
        phone: '9876543299',
        passwordHash: employerPasswordHash,
        role: 'employer',
        preferredLanguage: 'en',
        status: 'active',
        isVerified: true,
      });

      await EmployerProfile.create({
        userId: employerUser._id || employerUser.id,
        companyName: 'Patil Builders & Contractors',
        contactPerson: 'Rohan Patil',
        businessType: 'General Construction & Renovation',
        city: 'Pune',
        area: 'Kothrud',
        location: 'Kothrud, Pune',
        phone: '9876543299',
        email: 'employer@kaamsetu.ai',
        profileCompletion: 95,
      });
    }

    // Check if any open jobs exist
    const existingJobs = await Job.find({ status: 'open' });
    if (!existingJobs || existingJobs.length === 0) {
      await Job.create({
        employerId: employerUser._id || employerUser.id,
        title: 'Electrician required for residential apartment wiring',
        description: 'Need a certified skilled electrician for conduit piping, switchboard installation, and cable pulling for a 3BHK flat.',
        category: 'electrician',
        requiredSkills: ['Electrician', 'Wiring'],
        wageType: 'daily',
        wageAmount: 800,
        durationDays: 5,
        location: 'Kothrud, Pune',
        city: 'Pune',
        area: 'Kothrud',
        latitude: 18.5074,
        longitude: 73.8077,
        workersNeeded: 2,
        status: 'open',
      });

      await Job.create({
        employerId: employerUser._id || employerUser.id,
        title: 'Mason for compound wall plastering and brickwork',
        description: 'Urgent requirement for skilled mason for 40-foot compound wall bricklaying and smooth exterior cement plastering.',
        category: 'mason',
        requiredSkills: ['Mason', 'Plastering'],
        wageType: 'daily',
        wageAmount: 850,
        durationDays: 7,
        location: 'Hadapsar, Pune',
        city: 'Pune',
        area: 'Hadapsar',
        latitude: 18.5089,
        longitude: 73.9259,
        workersNeeded: 3,
        status: 'open',
      });
    }

    console.log('[KaamSetu AI] Successfully seeded demo workers, employer, and open jobs.');
  } catch (err) {
    console.warn('[KaamSetu AI] Notice seeding initial demo data:', err.message);
  }
};

