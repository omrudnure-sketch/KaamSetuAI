import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  JobApplication,
  JobInvitation,
  HiringAgreement,
  Project,
  ProjectWorker,
  Attendance,
  ProgressUpdate,
  ProjectExtension,
  Payment,
  Review,
  Complaint,
  Dispute,
  VerificationRecord,
  AuditLog,
} from '../models/index.js';

/**
 * 1. WORKER DIRECTORY
 */
export const getWorkerDirectory = async ({
  search = '',
  city = '',
  skill = '',
  availability = '',
  verificationStatus = '',
  page = 1,
  limit = 20,
}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  // Fetch all worker profiles populated with user details
  const allProfiles = await WorkerProfile.find({}).populate(
    'userId',
    'name phone email status createdAt lastLoginAt preferredLanguage'
  );

  let filtered = allProfiles.map((pDoc) => {
    const doc = pDoc.toJSON ? pDoc.toJSON() : { ...pDoc };
    const user = doc.userId || {};
    const name = doc.fullName || user.name || 'Skilled Worker';
    const phone = doc.phone || user.phone || '';
    const email = doc.email || user.email || '';
    const workerCity = doc.city || doc.location?.city || '';
    const primarySkill = doc.primarySkill || (Array.isArray(doc.skills) ? doc.skills[0] : 'General Worker');
    const isAvail = doc.availability === 'available' || (doc.isAvailableForWork && doc.availability !== 'busy');

    return {
      id: String(doc.id || doc._id),
      workerId: String(doc.id || doc._id),
      userId: String(user.id || user._id || ''),
      fullName: name,
      photo: doc.profilePhoto || doc.avatar || null,
      phone,
      email: email || null,
      primarySkill,
      skills: Array.isArray(doc.skills) ? doc.skills : [primarySkill],
      experienceYears: Number(doc.experienceYears) || 0,
      dailyWage: Number(doc.dailyWage) || 0,
      address: doc.address || doc.location?.address || '',
      city: workerCity || 'Unspecified',
      district: doc.district || doc.location?.district || workerCity || 'Unspecified',
      verificationStatus: doc.verificationStatus || (doc.isVerified ? 'verified' : 'unverified'),
      availability: doc.availability || (isAvail ? 'available' : 'busy'),
      isAvailableForWork: isAvail,
      rating: Number(doc.rating) || 0,
      totalReviews: Number(doc.totalReviews || doc.reviewCount) || 0,
      userStatus: user.status || 'active',
      createdAt: doc.createdAt || user.createdAt,
      lastActiveAt: user.lastLoginAt || doc.updatedAt || doc.createdAt,
      hasCoordinates: Boolean(doc.longitude && doc.latitude),
      coordinates: [Number(doc.longitude) || 0, Number(doc.latitude) || 0],
    };
  });

  // Apply search
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (w) =>
        w.fullName.toLowerCase().includes(s) ||
        w.phone.includes(s) ||
        (w.email && w.email.toLowerCase().includes(s)) ||
        w.id.toLowerCase().includes(s) ||
        w.primarySkill.toLowerCase().includes(s) ||
        w.skills.some((sk) => sk.toLowerCase().includes(s)) ||
        w.city.toLowerCase().includes(s)
    );
  }

  // Apply filters
  if (city.trim()) {
    filtered = filtered.filter((w) => w.city.toLowerCase().includes(city.trim().toLowerCase()));
  }

  if (skill.trim()) {
    filtered = filtered.filter((w) =>
      w.primarySkill.toLowerCase().includes(skill.trim().toLowerCase()) ||
      w.skills.some((sk) => sk.toLowerCase().includes(skill.trim().toLowerCase()))
    );
  }

  if (availability.trim()) {
    filtered = filtered.filter((w) => w.availability.toLowerCase() === availability.trim().toLowerCase());
  }

  if (verificationStatus.trim()) {
    filtered = filtered.filter((w) => w.verificationStatus.toLowerCase() === verificationStatus.trim().toLowerCase());
  }

  const total = filtered.length;
  const skip = (p - 1) * l;
  const workers = filtered.slice(skip, skip + l);

  return {
    workers,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
  };
};

/**
 * 2. DETAILED WORKER PROFILE & WORK LIFECYCLE
 */
export const getWorkerDetails = async (workerId) => {
  // Find worker profile
  let profile = await WorkerProfile.findById(workerId).populate('userId');
  if (!profile) {
    // Try by userId
    profile = await WorkerProfile.findOne({ userId: workerId }).populate('userId');
  }

  if (!profile) {
    const error = new Error('Worker profile not found');
    error.status = 404;
    throw error;
  }

  const workerDoc = profile.toJSON ? profile.toJSON() : { ...profile };
  const user = workerDoc.userId || {};
  const actualUserId = String(user.id || user._id || workerDoc.userId);
  const actualWorkerProfileId = String(workerDoc.id || workerDoc._id);

  // Parallel fetch work history across all platform models
  const [
    applications,
    invitations,
    agreements,
    projects,
    attendances,
    progressUpdates,
    payments,
    extensions,
    reviews,
    complaints,
    disputes,
    verifications,
  ] = await Promise.all([
    // Applications submitted by this worker
    JobApplication.find({ workerId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('jobId', 'title category wageAmount wageType status location')
      .populate('employerId', 'name phone')
      .sort({ createdAt: -1 }),

    // Invitations received
    JobInvitation.find({ workerId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('jobId', 'title category wageAmount wageType location')
      .populate('employerId', 'name phone')
      .sort({ createdAt: -1 }),

    // Hiring agreements
    HiringAgreement.find({ workerId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('employerId', 'name phone email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 }),

    // Projects
    Project.find({
      $or: [
        { 'workers.workerId': { $in: [actualWorkerProfileId, actualUserId] } },
        { assignedWorkerId: { $in: [actualWorkerProfileId, actualUserId] } },
      ],
    })
      .populate('employerId', 'name phone companyName')
      .sort({ createdAt: -1 }),

    // Attendances
    Attendance.find({ workerId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('projectId', 'name title')
      .sort({ date: -1, createdAt: -1 }),

    // Progress updates
    ProgressUpdate.find({ workerId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('projectId', 'name title')
      .sort({ date: -1, createdAt: -1 }),

    // Payments received or pending
    Payment.find({ recipientId: { $in: [actualWorkerProfileId, actualUserId] } })
      .populate('payerId', 'name phone')
      .populate('projectId', 'name title')
      .sort({ createdAt: -1 }),

    // Extension requests
    ProjectExtension.find({
      $or: [
        { requestedBy: { $in: [actualWorkerProfileId, actualUserId] } },
        { workerId: { $in: [actualWorkerProfileId, actualUserId] } },
      ],
    }).sort({ createdAt: -1 }),

    // Reviews received
    Review.find({
      $or: [
        { revieweeId: { $in: [actualWorkerProfileId, actualUserId] } },
        { workerId: { $in: [actualWorkerProfileId, actualUserId] } },
      ],
    })
      .populate('reviewerId', 'name role')
      .sort({ createdAt: -1 }),

    // Complaints involving worker
    Complaint.find({
      $or: [
        { reporterId: actualUserId },
        { targetUserId: actualUserId },
      ],
    }).sort({ createdAt: -1 }),

    // Disputes involving worker
    Dispute.find({
      $or: [
        { initiatedBy: actualUserId },
        { againstUserId: actualUserId },
      ],
    }).sort({ createdAt: -1 }),

    // Verification records
    VerificationRecord.find({
      $or: [
        { workerId: actualWorkerProfileId },
        { userId: actualUserId },
      ],
    }).sort({ createdAt: -1 }),
  ]);

  // Determine current active project & employer
  const activeProject = projects.find(
    (p) => p.status === 'in_progress' || p.status === 'confirmed' || p.status === 'created'
  ) || null;

  // Determine attendance today
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceToday = attendances.find((a) => a.date === todayStr) || null;

  // Aggregate stats
  const totalAgreedEarnings = agreements.reduce((acc, a) => acc + (Number(a.agreedAmount || a.agreedWage) || 0), 0);
  const totalPaymentsReceived = payments
    .filter((p) => p.status === 'completed' || p.status === 'paid')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaymentsPending = payments
    .filter((p) => p.status === 'pending' || p.status === 'escrow')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const presentDaysCount = attendances.filter((a) => a.status === 'present').length;
  const absentDaysCount = attendances.filter((a) => a.status === 'absent').length;
  const halfDaysCount = attendances.filter((a) => a.status === 'half_day').length;

  return {
    worker: {
      id: actualWorkerProfileId,
      userId: actualUserId,
      fullName: workerDoc.fullName || user.name || 'Skilled Worker',
      phone: workerDoc.phone || user.phone || '',
      email: workerDoc.email || user.email || null,
      photo: workerDoc.profilePhoto || workerDoc.avatar || null,
      primarySkill: workerDoc.primarySkill || (Array.isArray(workerDoc.skills) ? workerDoc.skills[0] : 'General Worker'),
      skills: Array.isArray(workerDoc.skills) ? workerDoc.skills : [],
      experienceYears: Number(workerDoc.experienceYears) || 0,
      dailyWage: Number(workerDoc.dailyWage) || 0,
      bio: workerDoc.bio || '',
      address: workerDoc.address || workerDoc.location?.address || '',
      city: workerDoc.city || workerDoc.location?.city || 'Unspecified',
      district: workerDoc.district || workerDoc.location?.district || 'Unspecified',
      coordinates: [Number(workerDoc.longitude) || 0, Number(workerDoc.latitude) || 0],
      hasCoordinates: Boolean(workerDoc.longitude && workerDoc.latitude),
      verificationStatus: workerDoc.verificationStatus || (workerDoc.isVerified ? 'verified' : 'unverified'),
      availability: workerDoc.availability || 'available',
      rating: Number(workerDoc.rating) || 0,
      totalReviews: reviews.length,
      userStatus: user.status || 'active',
      createdAt: workerDoc.createdAt || user.createdAt,
      lastActiveAt: user.lastLoginAt || workerDoc.updatedAt,
    },
    currentActivity: {
      hasActiveProject: Boolean(activeProject),
      activeProject: activeProject
        ? {
            id: String(activeProject.id || activeProject._id),
            title: activeProject.name || activeProject.title,
            employerName: activeProject.employerId?.name || 'Employer',
            employerCompany: activeProject.employerId?.companyName || '',
            employerPhone: activeProject.employerId?.phone || '',
            startDate: activeProject.startDate,
            expectedEndDate: activeProject.expectedEndDate,
            location: activeProject.location || activeProject.city || 'Site Location',
            progress: Number(activeProject.progress || activeProject.completionPercentage) || 0,
            status: activeProject.status,
          }
        : null,
      attendanceToday: attendanceToday
        ? {
            status: attendanceToday.status,
            checkIn: attendanceToday.checkInTime || attendanceToday.checkIn,
            checkOut: attendanceToday.checkOutTime || attendanceToday.checkOut,
            hours: attendanceToday.hoursWorked || 0,
          }
        : { status: 'Not logged today', checkIn: null, checkOut: null },
      latestProgressUpdate: progressUpdates[0] || null,
      paymentStatus: totalPaymentsPending > 0 ? `${totalPaymentsPending} INR Pending` : 'All Milestones Settled',
    },
    workHistory: {
      stats: {
        totalApplications: applications.length,
        acceptedApplications: applications.filter((a) => a.status === 'accepted').length,
        rejectedApplications: applications.filter((a) => a.status === 'rejected').length,
        pendingApplications: applications.filter((a) => a.status === 'pending').length,
        totalInvitations: invitations.length,
        totalAgreements: agreements.length,
        activeProjects: projects.filter((p) => p.status === 'in_progress').length,
        completedProjects: projects.filter((p) => p.status === 'completed').length,
        cancelledProjects: projects.filter((p) => p.status === 'cancelled').length,
        totalAttendanceDays: attendances.length,
        presentDays: presentDaysCount,
        absentDays: absentDaysCount,
        halfDays: halfDaysCount,
        totalEarningsAgreed: totalAgreedEarnings,
        totalPaymentsReceived,
        totalPaymentsPending,
        totalProgressReports: progressUpdates.length,
        extensionsRequested: extensions.length,
        complaintsCount: complaints.length,
        disputesCount: disputes.length,
      },
      applications: applications.slice(0, 15),
      invitations: invitations.slice(0, 10),
      agreements: agreements.slice(0, 10),
      projects: projects.slice(0, 10),
      attendances: attendances.slice(0, 20),
      progressUpdates: progressUpdates.slice(0, 15),
      payments: payments.slice(0, 15),
      extensions,
      reviews,
      complaints,
      disputes,
      verifications,
    },
  };
};

/**
 * 3. EMPLOYER DIRECTORY
 */
export const getEmployerDirectory = async ({
  search = '',
  city = '',
  verificationStatus = '',
  industry = '',
  page = 1,
  limit = 20,
}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  // Fetch all employer profiles populated with user details
  const allProfiles = await EmployerProfile.find({}).populate(
    'userId',
    'name phone email status createdAt lastLoginAt'
  );

  let filtered = allProfiles.map((pDoc) => {
    const doc = pDoc.toJSON ? pDoc.toJSON() : { ...pDoc };
    const user = doc.userId || {};
    const companyName = doc.companyName || user.name || 'Enterprise Employer';
    const contactPerson = doc.contactPerson || user.name || companyName;
    const phone = doc.phone || user.phone || '';
    const email = doc.email || user.email || '';
    const empCity = doc.city || doc.location?.city || '';

    return {
      id: String(doc.id || doc._id),
      employerId: String(doc.id || doc._id),
      userId: String(user.id || user._id || ''),
      companyName,
      contactPerson,
      phone,
      email: email || null,
      logo: doc.logo || doc.profileImage || null,
      businessType: doc.businessType || doc.companyType || 'Business Entity',
      industry: doc.industry || 'General Contracting',
      address: doc.address || doc.location?.address || '',
      city: empCity || 'Unspecified',
      district: doc.district || doc.location?.district || empCity || 'Unspecified',
      verificationStatus: doc.verificationStatus || (doc.isVerified ? 'verified' : 'unverified'),
      rating: Number(doc.rating) || 0,
      totalReviews: Number(doc.totalReviews || doc.reviewCount) || 0,
      userStatus: user.status || 'active',
      createdAt: doc.createdAt || user.createdAt,
      lastActiveAt: user.lastLoginAt || doc.updatedAt || doc.createdAt,
      hasCoordinates: Boolean(doc.longitude && doc.latitude),
      coordinates: [Number(doc.longitude) || 0, Number(doc.latitude) || 0],
    };
  });

  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.companyName.toLowerCase().includes(s) ||
        e.contactPerson.toLowerCase().includes(s) ||
        e.phone.includes(s) ||
        (e.email && e.email.toLowerCase().includes(s)) ||
        e.id.toLowerCase().includes(s) ||
        e.city.toLowerCase().includes(s)
    );
  }

  if (city.trim()) {
    filtered = filtered.filter((e) => e.city.toLowerCase().includes(city.trim().toLowerCase()));
  }

  if (verificationStatus.trim()) {
    filtered = filtered.filter((e) => e.verificationStatus.toLowerCase() === verificationStatus.trim().toLowerCase());
  }

  if (industry.trim()) {
    filtered = filtered.filter((e) => e.industry.toLowerCase().includes(industry.trim().toLowerCase()));
  }

  const total = filtered.length;
  const skip = (p - 1) * l;
  const employers = filtered.slice(skip, skip + l);

  return {
    employers,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
  };
};

/**
 * 4. DETAILED EMPLOYER PROFILE & HIRING LIFECYCLE
 */
export const getEmployerDetails = async (employerId) => {
  let profile = await EmployerProfile.findById(employerId).populate('userId');
  if (!profile) {
    profile = await EmployerProfile.findOne({ userId: employerId }).populate('userId');
  }

  if (!profile) {
    const error = new Error('Employer profile not found');
    error.status = 404;
    throw error;
  }

  const empDoc = profile.toJSON ? profile.toJSON() : { ...profile };
  const user = empDoc.userId || {};
  const actualUserId = String(user.id || user._id || empDoc.userId);
  const actualEmployerProfileId = String(empDoc.id || empDoc._id);

  // Parallel fetch hiring history
  const [
    jobs,
    agreements,
    projects,
    payments,
    reviews,
    complaints,
    disputes,
  ] = await Promise.all([
    // Jobs posted by this employer
    Job.find({ employerId: { $in: [actualEmployerProfileId, actualUserId] } })
      .sort({ createdAt: -1 }),

    // Hiring agreements created
    HiringAgreement.find({ employerId: { $in: [actualEmployerProfileId, actualUserId] } })
      .populate('workerId', 'fullName name phone')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 }),

    // Projects managed
    Project.find({ employerId: { $in: [actualEmployerProfileId, actualUserId] } })
      .populate('workers.workerId', 'fullName name phone')
      .sort({ createdAt: -1 }),

    // Payments disbursed or pending
    Payment.find({ payerId: { $in: [actualEmployerProfileId, actualUserId] } })
      .populate('recipientId', 'fullName name phone')
      .populate('projectId', 'name title')
      .sort({ createdAt: -1 }),

    // Reviews received
    Review.find({
      $or: [
        { revieweeId: { $in: [actualEmployerProfileId, actualUserId] } },
        { employerId: { $in: [actualEmployerProfileId, actualUserId] } },
      ],
    })
      .populate('reviewerId', 'name role')
      .sort({ createdAt: -1 }),

    // Complaints involving employer
    Complaint.find({
      $or: [
        { reporterId: actualUserId },
        { targetUserId: actualUserId },
      ],
    }).sort({ createdAt: -1 }),

    // Disputes involving employer
    Dispute.find({
      $or: [
        { initiatedBy: actualUserId },
        { againstUserId: actualUserId },
      ],
    }).sort({ createdAt: -1 }),
  ]);

  const activeProjects = projects.filter(
    (p) => p.status === 'in_progress' || p.status === 'confirmed' || p.status === 'created'
  );
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const now = new Date();
  const delayedProjects = activeProjects.filter((p) => {
    const end = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
    return end && end < now;
  });

  const totalPaymentsMade = payments
    .filter((p) => p.status === 'completed' || p.status === 'paid')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPaymentsPending = payments
    .filter((p) => p.status === 'pending' || p.status === 'escrow')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return {
    employer: {
      id: actualEmployerProfileId,
      userId: actualUserId,
      companyName: empDoc.companyName || user.name || 'Enterprise Employer',
      contactPerson: empDoc.contactPerson || user.name || 'Authorized Contact',
      phone: empDoc.phone || user.phone || '',
      email: empDoc.email || user.email || null,
      logo: empDoc.logo || empDoc.profileImage || null,
      businessType: empDoc.businessType || empDoc.companyType || 'Enterprise',
      industry: empDoc.industry || 'General Contracting',
      gstin: empDoc.gstin || empDoc.taxId || null,
      pan: empDoc.pan || null,
      website: empDoc.website || null,
      address: empDoc.address || empDoc.location?.address || '',
      city: empDoc.city || empDoc.location?.city || 'Unspecified',
      district: empDoc.district || empDoc.location?.district || 'Unspecified',
      coordinates: [Number(empDoc.longitude) || 0, Number(empDoc.latitude) || 0],
      hasCoordinates: Boolean(empDoc.longitude && empDoc.latitude),
      verificationStatus: empDoc.verificationStatus || (empDoc.isVerified ? 'verified' : 'unverified'),
      rating: Number(empDoc.rating) || 0,
      totalReviews: reviews.length,
      userStatus: user.status || 'active',
      createdAt: empDoc.createdAt || user.createdAt,
      lastActiveAt: user.lastLoginAt || empDoc.updatedAt,
    },
    currentActivity: {
      activeProjectsCount: activeProjects.length,
      delayedProjectsCount: delayedProjects.length,
      activeProjects: activeProjects.map((p) => ({
        id: String(p.id || p._id),
        title: p.name || p.title,
        status: p.status,
        progress: Number(p.progress || p.completionPercentage) || 0,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        isDelayed: Boolean(p.expectedEndDate && new Date(p.expectedEndDate) < now),
        city: p.city || p.location?.city || 'Site Location',
        workersCount: Array.isArray(p.workers) ? p.workers.length : 1,
      })),
      pendingPayments: totalPaymentsPending > 0 ? `${totalPaymentsPending} INR Pending` : 'All Settled',
    },
    hiringHistory: {
      stats: {
        totalJobsPosted: jobs.length,
        activeJobs: jobs.filter((j) => j.status === 'open').length,
        filledJobs: jobs.filter((j) => j.status === 'filled').length,
        closedJobs: jobs.filter((j) => j.status === 'closed').length,
        totalWorkersHired: agreements.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        delayedProjects: delayedProjects.length,
        totalPaymentsMade,
        totalPaymentsPending,
        complaintsCount: complaints.length,
        disputesCount: disputes.length,
      },
      jobs: jobs.slice(0, 15),
      agreements: agreements.slice(0, 15),
      projects: projects.slice(0, 15),
      payments: payments.slice(0, 15),
      reviews,
      complaints,
      disputes,
    },
  };
};

/**
 * 5. COMPLETE PROJECT MONITORING
 */
export const getProjectMonitoringList = async ({
  status = '',
  search = '',
  city = '',
  delayedOnly = false,
  page = 1,
  limit = 20,
}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  const allProjects = await Project.find({})
    .populate('employerId', 'name phone email companyName')
    .populate('workers.workerId', 'fullName name phone skills primarySkill')
    .populate('jobId', 'title category wageAmount wageType')
    .sort({ createdAt: -1 });

  const now = new Date();

  let formatted = allProjects.map((pDoc) => {
    const doc = pDoc.toJSON ? pDoc.toJSON() : { ...pDoc };
    const emp = doc.employerId || {};
    const job = doc.jobId || {};
    const workersList = Array.isArray(doc.workers)
      ? doc.workers.map((w) => {
          const wObj = w.workerId || {};
          return {
            id: String(wObj.id || wObj._id || w.workerId || ''),
            name: wObj.fullName || wObj.name || 'Assigned Worker',
            phone: wObj.phone || '',
            skill: wObj.primarySkill || (Array.isArray(wObj.skills) ? wObj.skills[0] : 'Worker'),
          };
        })
      : [];

    const expectedEnd = doc.expectedEndDate ? new Date(doc.expectedEndDate) : null;
    const isCompleted = doc.status === 'completed';
    const isCancelled = doc.status === 'cancelled';
    const isDelayed = !isCompleted && !isCancelled && expectedEnd && expectedEnd < now;
    const daysDelayed = isDelayed ? Math.floor((now - expectedEnd) / (1000 * 60 * 60 * 24)) : 0;

    let progressPct = Number(doc.progress || doc.completionPercentage);
    if (isNaN(progressPct)) {
      progressPct = isCompleted ? 100 : doc.status === 'in_progress' ? 50 : 0;
    }

    return {
      id: String(doc.id || doc._id),
      projectId: String(doc.id || doc._id),
      title: doc.name || doc.title || job.title || 'Civil Works Project',
      jobTitle: job.title || doc.title || 'Site Gig Job',
      jobCategory: job.category || 'Construction',
      employer: {
        id: String(emp.id || emp._id || ''),
        name: emp.name || emp.companyName || 'Employer',
        companyName: emp.companyName || emp.name || 'Company',
        phone: emp.phone || '',
        email: emp.email || '',
      },
      assignedWorkers: workersList,
      workersCount: workersList.length || 1,
      location: {
        address: doc.address || doc.location?.address || '',
        city: doc.city || doc.location?.city || 'Unspecified',
        coordinates: [Number(doc.longitude) || 0, Number(doc.latitude) || 0],
        hasCoordinates: Boolean(doc.longitude && doc.latitude),
      },
      startDate: doc.startDate,
      expectedEndDate: doc.expectedEndDate,
      actualCompletionDate: doc.actualCompletionDate || doc.completedAt || (isCompleted ? doc.updatedAt : null),
      agreedWage: Number(doc.agreedWage) || Number(job.wageAmount) || 0,
      totalAgreedAmount: Number(doc.totalAgreedAmount || doc.budget) || Number(doc.agreedWage) * 7 || 0,
      paymentStatus: doc.paymentStatus || (isCompleted ? 'paid' : 'in_escrow'),
      status: doc.status || 'in_progress',
      progressPercentage: progressPct,
      isDelayed,
      daysDelayed,
      latestUpdate: doc.updatedAt || doc.createdAt,
      createdAt: doc.createdAt,
    };
  });

  // Apply search
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    formatted = formatted.filter(
      (pr) =>
        pr.title.toLowerCase().includes(s) ||
        pr.jobTitle.toLowerCase().includes(s) ||
        pr.employer.name.toLowerCase().includes(s) ||
        pr.employer.companyName.toLowerCase().includes(s) ||
        pr.assignedWorkers.some((w) => w.name.toLowerCase().includes(s)) ||
        pr.location.city.toLowerCase().includes(s) ||
        pr.id.toLowerCase().includes(s)
    );
  }

  // Apply status filter
  if (status.trim() && status !== 'all') {
    if (status === 'delayed') {
      formatted = formatted.filter((pr) => pr.isDelayed);
    } else {
      formatted = formatted.filter((pr) => pr.status === status);
    }
  }

  // Delayed only
  if (delayedOnly) {
    formatted = formatted.filter((pr) => pr.isDelayed);
  }

  // City filter
  if (city.trim()) {
    formatted = formatted.filter((pr) => pr.location.city.toLowerCase().includes(city.trim().toLowerCase()));
  }

  const total = formatted.length;
  const skip = (p - 1) * l;
  const projects = formatted.slice(skip, skip + l);

  return {
    projects,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    summary: {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter((pr) => pr.status === 'in_progress' || pr.status === 'confirmed').length,
      completedProjects: allProjects.filter((pr) => pr.status === 'completed').length,
      delayedProjects: formatted.filter((pr) => pr.isDelayed).length,
    },
  };
};

/**
 * 6. COMPLETE PROJECT LIFECYCLE & PROGRESS MONITORING
 */
export const getProjectMonitoringDetails = async (projectId) => {
  const projectDoc = await Project.findById(projectId)
    .populate('employerId')
    .populate('jobId')
    .populate('workers.workerId');

  if (!projectDoc) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  const p = projectDoc.toJSON ? projectDoc.toJSON() : { ...projectDoc };
  const actualProjectId = String(p.id || p._id);

  // Parallel fetch complete lifecycle artifacts
  const [
    attendances,
    progressUpdates,
    extensions,
    payments,
    reviews,
    complaints,
    disputes,
  ] = await Promise.all([
    Attendance.find({ projectId: actualProjectId }).populate('workerId', 'name fullName phone').sort({ date: -1 }),
    ProgressUpdate.find({ projectId: actualProjectId }).populate('workerId', 'name fullName').sort({ date: -1 }),
    ProjectExtension.find({ projectId: actualProjectId }).sort({ createdAt: -1 }),
    Payment.find({ projectId: actualProjectId }).sort({ createdAt: -1 }),
    Review.find({ projectId: actualProjectId }).populate('reviewerId', 'name role').sort({ createdAt: -1 }),
    Complaint.find({ projectId: actualProjectId }).sort({ createdAt: -1 }),
    Dispute.find({ projectId: actualProjectId }).sort({ createdAt: -1 }),
  ]);

  const emp = p.employerId || {};
  const job = p.jobId || {};
  const workers = Array.isArray(p.workers)
    ? p.workers.map((w) => {
        const wDoc = w.workerId || {};
        return {
          id: String(wDoc.id || wDoc._id || w.workerId),
          name: wDoc.fullName || wDoc.name || 'Assigned Worker',
          phone: wDoc.phone || '',
          skills: wDoc.skills || [],
          roleOnSite: w.role || 'Skilled Labour',
        };
      })
    : [];

  const now = new Date();
  const expectedEnd = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
  const isCompleted = p.status === 'completed';
  const isDelayed = !isCompleted && p.status !== 'cancelled' && expectedEnd && expectedEnd < now;

  // Lifecycle progression milestones
  const lifecycle = [
    {
      step: 1,
      title: 'Job Posted',
      completed: true,
      timestamp: job.createdAt || p.createdAt,
      details: `Job "${job.title || p.title}" posted with wage ${job.wageAmount || p.agreedWage} INR.`,
    },
    {
      step: 2,
      title: 'Hiring Agreement Created',
      completed: true,
      timestamp: p.startDate || p.createdAt,
      details: `Agreement terms finalized with ${workers.length || 1} worker(s).`,
    },
    {
      step: 3,
      title: 'Project Initiated',
      completed: true,
      timestamp: p.startDate || p.createdAt,
      details: `Site work commenced on ${p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Site Day 1'}.`,
    },
    {
      step: 4,
      title: 'Daily Attendance & Work Execution',
      completed: attendances.length > 0,
      timestamp: attendances[0]?.date || null,
      details: `${attendances.length} attendance day records logged on site.`,
    },
    {
      step: 5,
      title: 'Progress Reports Submitted',
      completed: progressUpdates.length > 0,
      timestamp: progressUpdates[0]?.date || null,
      details: `${progressUpdates.length} daily progress milestone submissions.`,
    },
    {
      step: 6,
      title: 'Extensions Handled',
      completed: extensions.length > 0,
      timestamp: extensions[0]?.createdAt || null,
      details: extensions.length > 0
        ? `${extensions.length} extension requests recorded (${extensions.filter((e) => e.status === 'approved').length} approved).`
        : 'On schedule, no extensions requested.',
    },
    {
      step: 7,
      title: 'Project Completion',
      completed: isCompleted,
      timestamp: p.actualCompletionDate || p.completedAt || (isCompleted ? p.updatedAt : null),
      details: isCompleted ? 'All site milestones verified as completed.' : 'Currently ongoing on site.',
    },
    {
      step: 8,
      title: 'Payments Settled',
      completed: payments.some((pay) => pay.status === 'completed' || pay.status === 'paid'),
      timestamp: payments[0]?.createdAt || null,
      details: `${payments.length} transactions recorded (${payments.filter((pay) => pay.status === 'completed').length} completed).`,
    },
    {
      step: 9,
      title: 'Mutual Reviews Exchanged',
      completed: reviews.length > 0,
      timestamp: reviews[0]?.createdAt || null,
      details: `${reviews.length} ratings and feedback verified on site.`,
    },
  ];

  return {
    project: {
      id: actualProjectId,
      title: p.name || p.title || job.title || 'Civil Works Project',
      jobId: String(job.id || job._id || ''),
      jobTitle: job.title || p.title,
      employer: {
        id: String(emp.id || emp._id || ''),
        name: emp.name || emp.companyName || 'Employer',
        companyName: emp.companyName || emp.name || 'Company',
        phone: emp.phone || '',
        email: emp.email || '',
      },
      workers,
      location: {
        address: p.address || p.location?.address || '',
        city: p.city || p.location?.city || 'Unspecified',
        coordinates: [Number(p.longitude) || 0, Number(p.latitude) || 0],
        hasCoordinates: Boolean(p.longitude && p.latitude),
      },
      startDate: p.startDate,
      expectedEndDate: p.expectedEndDate,
      actualCompletionDate: p.actualCompletionDate || p.completedAt,
      agreedWage: Number(p.agreedWage) || Number(job.wageAmount) || 0,
      totalAgreedAmount: Number(p.totalAgreedAmount || p.budget) || 0,
      paymentStatus: p.paymentStatus || 'in_progress',
      status: p.status || 'in_progress',
      progressPercentage: Number(p.progress || p.completionPercentage) || 0,
      isDelayed,
      daysDelayed: isDelayed ? Math.floor((now - expectedEnd) / (1000 * 60 * 60 * 24)) : 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
    lifecycle,
    attendanceRecords: {
      total: attendances.length,
      present: attendances.filter((a) => a.status === 'present').length,
      absent: attendances.filter((a) => a.status === 'absent').length,
      halfDay: attendances.filter((a) => a.status === 'half_day').length,
      records: attendances,
    },
    progressReports: {
      total: progressUpdates.length,
      reports: progressUpdates,
    },
    extensions,
    payments,
    reviews,
    complaints,
    disputes,
  };
};

/**
 * 7. REAL-TIME ADMIN MONITORING OVERVIEW & KPIS
 */
export const getAdminMonitoringOverview = async () => {
  const now = new Date();

  const [
    totalWorkers,
    verifiedWorkers,
    availableWorkers,
    totalEmployers,
    verifiedEmployers,
    totalJobs,
    openJobs,
    projects,
    payments,
    openComplaints,
    openDisputes,
  ] = await Promise.all([
    WorkerProfile.countDocuments(),
    WorkerProfile.countDocuments({ $or: [{ isVerified: true }, { verificationStatus: 'verified' }] }),
    WorkerProfile.countDocuments({ $or: [{ availability: 'available' }, { isAvailableForWork: true }] }),
    EmployerProfile.countDocuments(),
    EmployerProfile.countDocuments({ $or: [{ isVerified: true }, { verificationStatus: 'verified' }] }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Project.find({}),
    Payment.find({}),
    Complaint.countDocuments({ status: { $in: ['new', 'under_review', 'investigating', 'open'] } }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'investigating'] } }),
  ]);

  const activeProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'confirmed' || p.status === 'created');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const delayedProjects = activeProjects.filter((p) => {
    const end = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
    return end && end < now;
  });

  const currentlyHiredWorkers = projects
    .filter((p) => p.status === 'in_progress')
    .reduce((acc, p) => acc + (Array.isArray(p.workers) ? p.workers.length : 1), 0);

  const completedPaymentsSum = payments
    .filter((p) => p.status === 'completed' || p.status === 'paid')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const pendingPaymentsSum = payments
    .filter((p) => p.status === 'pending' || p.status === 'escrow')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return {
    kpis: {
      totalWorkers,
      totalEmployers,
      verifiedWorkers,
      verifiedEmployers,
      availableWorkers,
      currentlyHiredWorkers,
      totalJobs,
      openJobs,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      delayedProjects: delayedProjects.length,
      totalRecordedPayments: completedPaymentsSum,
      pendingPayments: pendingPaymentsSum,
      openComplaints,
      openDisputes,
    },
  };
};

/**
 * 8. LIVE ACTIVITY FEED
 */
export const getAdminLiveActivityFeed = async (limit = 35) => {
  const l = Math.max(5, Math.min(100, Number(limit) || 35));

  const [
    recentUsers,
    recentJobs,
    recentAgreements,
    recentProjects,
    recentAttendances,
    recentProgress,
    recentPayments,
    recentReviews,
    recentComplaints,
    recentDisputes,
    auditLogs,
  ] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).limit(10),
    Job.find({}).populate('employerId', 'name').sort({ createdAt: -1 }).limit(10),
    HiringAgreement.find({}).populate('workerId', 'fullName name').populate('employerId', 'name').sort({ createdAt: -1 }).limit(10),
    Project.find({}).populate('employerId', 'name').sort({ createdAt: -1 }).limit(10),
    Attendance.find({}).populate('workerId', 'fullName name').populate('projectId', 'title name').sort({ createdAt: -1 }).limit(10),
    ProgressUpdate.find({}).populate('workerId', 'fullName name').populate('projectId', 'title name').sort({ createdAt: -1 }).limit(10),
    Payment.find({}).populate('payerId', 'name').populate('recipientId', 'name fullName').sort({ createdAt: -1 }).limit(10),
    Review.find({}).populate('reviewerId', 'name').sort({ createdAt: -1 }).limit(10),
    Complaint.find({}).populate('reporterId', 'name').sort({ createdAt: -1 }).limit(10),
    Dispute.find({}).populate('initiatedBy', 'name').sort({ createdAt: -1 }).limit(10),
    AuditLog.find({}).populate('adminId', 'name').sort({ createdAt: -1 }).limit(10),
  ]);

  const events = [];

  // 1. User Registrations
  recentUsers.forEach((u) => {
    if (!u.createdAt) return;
    events.push({
      id: `reg_${u.id || u._id}`,
      type: u.role === 'worker' ? 'worker_registration' : u.role === 'employer' ? 'employer_registration' : 'user_registration',
      title: `New ${u.role === 'worker' ? 'Worker' : u.role === 'employer' ? 'Employer' : 'User'} Registration`,
      actor: u.name || 'New User',
      role: u.role || 'user',
      timestamp: u.createdAt,
      description: `${u.name || 'User'} registered with mobile ${u.phone || 'N/A'}.`,
      badge: u.role === 'worker' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-emerald-500/10 text-emerald-500',
    });
  });

  // 2. Job Postings
  recentJobs.forEach((j) => {
    if (!j.createdAt) return;
    events.push({
      id: `job_${j.id || j._id}`,
      type: 'job_posted',
      title: 'New Job Opportunity Posted',
      actor: j.employerId?.name || 'Employer',
      role: 'employer',
      timestamp: j.createdAt,
      description: `Job "${j.title}" posted requiring ${j.workersRequired || 1} worker(s) at ${j.wageAmount || 0} INR/day.`,
      badge: 'bg-amber-500/10 text-amber-500',
    });
  });

  // 3. Agreements
  recentAgreements.forEach((a) => {
    if (!a.createdAt) return;
    events.push({
      id: `agr_${a.id || a._id}`,
      type: 'hiring_agreement',
      title: 'Hiring Agreement Created',
      actor: a.employerId?.name || 'Employer',
      role: 'employer',
      timestamp: a.createdAt,
      description: `Hiring agreement confirmed for worker ${a.workerId?.fullName || a.workerId?.name || 'Worker'} at ${a.agreedWage || 0} INR/day.`,
      badge: 'bg-emerald-500/10 text-emerald-500',
    });
  });

  // 4. Projects
  recentProjects.forEach((pr) => {
    if (!pr.createdAt) return;
    events.push({
      id: `proj_${pr.id || pr._id}`,
      type: pr.status === 'completed' ? 'project_completed' : 'project_started',
      title: pr.status === 'completed' ? 'Project Completed' : 'Project Initiated',
      actor: pr.employerId?.name || 'Employer',
      role: 'employer',
      timestamp: pr.updatedAt || pr.createdAt,
      description: `Project "${pr.name || pr.title}" is ${pr.status} with progress at ${pr.progress || 0}%.`,
      badge: pr.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500',
    });
  });

  // 5. Attendance Check-ins
  recentAttendances.forEach((at) => {
    if (!at.createdAt && !at.date) return;
    events.push({
      id: `att_${at.id || at._id}`,
      type: 'worker_attendance',
      title: 'Worker Attendance Recorded',
      actor: at.workerId?.fullName || at.workerId?.name || 'Worker',
      role: 'worker',
      timestamp: at.createdAt || at.date,
      description: `Status: ${at.status || 'present'} on project "${at.projectId?.title || at.projectId?.name || 'Site'}" on ${at.date}.`,
      badge: at.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
    });
  });

  // 6. Progress Updates
  recentProgress.forEach((pg) => {
    if (!pg.createdAt && !pg.date) return;
    events.push({
      id: `prog_${pg.id || pg._id}`,
      type: 'progress_update',
      title: 'Daily Progress Submitted',
      actor: pg.workerId?.fullName || pg.workerId?.name || 'Worker',
      role: 'worker',
      timestamp: pg.createdAt || pg.date,
      description: `Milestone logged: ${pg.workCompleted || 'Daily work completed'} (${pg.hoursSpent || 8} hrs).`,
      badge: 'bg-purple-500/10 text-purple-500',
    });
  });

  // 7. Payments
  recentPayments.forEach((py) => {
    if (!py.createdAt) return;
    events.push({
      id: `pay_${py.id || py._id}`,
      type: 'payment_update',
      title: 'Payment Disbursed',
      actor: py.payerId?.name || 'Employer',
      role: 'employer',
      timestamp: py.createdAt,
      description: `Amount ${py.amount || 0} INR ${py.status || 'completed'} to ${py.recipientId?.fullName || py.recipientId?.name || 'Worker'}.`,
      badge: 'bg-emerald-500/10 text-emerald-500',
    });
  });

  // 8. Complaints & Disputes
  recentComplaints.forEach((cp) => {
    if (!cp.createdAt) return;
    events.push({
      id: `cmp_${cp.id || cp._id}`,
      type: 'complaint_filed',
      title: 'Complaint Logged',
      actor: cp.reporterId?.name || 'User',
      role: 'user',
      timestamp: cp.createdAt,
      description: `Complaint regarding ${cp.category || 'Service'}: ${cp.subject || cp.description || 'Under review'}.`,
      badge: 'bg-rose-500/10 text-rose-500',
    });
  });

  // Sort descending by timestamp
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return events.slice(0, l);
};

/**
 * 9. GLOBAL ADMIN SEARCH
 */
export const getAdminGlobalSearch = async (query = '') => {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return { workers: [], employers: [], jobs: [], projects: [], complaints: [] };
  }

  const [workers, employers, jobs, projects, complaints] = await Promise.all([
    WorkerProfile.find({}).populate('userId', 'name phone email').limit(50),
    EmployerProfile.find({}).populate('userId', 'name phone email').limit(50),
    Job.find({}).populate('employerId', 'name').limit(50),
    Project.find({}).populate('employerId', 'name').limit(50),
    Complaint.find({}).limit(30),
  ]);

  const matchedWorkers = workers
    .filter((w) => {
      const name = (w.fullName || w.userId?.name || '').toLowerCase();
      const phone = (w.phone || w.userId?.phone || '');
      const email = (w.email || w.userId?.email || '').toLowerCase();
      const city = (w.city || w.location?.city || '').toLowerCase();
      const id = String(w.id || w._id).toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q) || id.includes(q);
    })
    .slice(0, 8)
    .map((w) => ({
      id: String(w.id || w._id),
      name: w.fullName || w.userId?.name || 'Worker',
      phone: w.phone || w.userId?.phone || '',
      email: w.email || w.userId?.email || '',
      skill: w.primarySkill || (Array.isArray(w.skills) ? w.skills[0] : 'Worker'),
      city: w.city || w.location?.city || 'Unspecified',
      role: 'worker',
      link: `/admin/users?search=${encodeURIComponent(w.fullName || w.userId?.name || '')}`,
    }));

  const matchedEmployers = employers
    .filter((e) => {
      const name = (e.companyName || e.userId?.name || '').toLowerCase();
      const phone = (e.phone || e.userId?.phone || '');
      const email = (e.email || e.userId?.email || '').toLowerCase();
      const city = (e.city || e.location?.city || '').toLowerCase();
      const id = String(e.id || e._id).toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q) || id.includes(q);
    })
    .slice(0, 8)
    .map((e) => ({
      id: String(e.id || e._id),
      name: e.companyName || e.userId?.name || 'Employer',
      phone: e.phone || e.userId?.phone || '',
      email: e.email || e.userId?.email || '',
      city: e.city || e.location?.city || 'Unspecified',
      role: 'employer',
      link: `/admin/users?search=${encodeURIComponent(e.companyName || e.userId?.name || '')}`,
    }));

  const matchedJobs = jobs
    .filter((j) => {
      const title = (j.title || '').toLowerCase();
      const city = (j.city || j.location?.city || '').toLowerCase();
      const id = String(j.id || j._id).toLowerCase();
      return title.includes(q) || city.includes(q) || id.includes(q);
    })
    .slice(0, 8)
    .map((j) => ({
      id: String(j.id || j._id),
      title: j.title,
      employerName: j.employerId?.name || 'Employer',
      wage: j.wageAmount || 0,
      status: j.status,
      city: j.city || j.location?.city || 'Unspecified',
      link: `/admin/map?search=${encodeURIComponent(j.title)}`,
    }));

  const matchedProjects = projects
    .filter((pr) => {
      const title = (pr.name || pr.title || '').toLowerCase();
      const city = (pr.city || pr.location?.city || '').toLowerCase();
      const id = String(pr.id || pr._id).toLowerCase();
      return title.includes(q) || city.includes(q) || id.includes(q);
    })
    .slice(0, 8)
    .map((pr) => ({
      id: String(pr.id || pr._id),
      title: pr.name || pr.title,
      employerName: pr.employerId?.name || 'Employer',
      status: pr.status,
      city: pr.city || pr.location?.city || 'Unspecified',
      link: `/admin/projects?search=${encodeURIComponent(pr.name || pr.title)}`,
    }));

  return {
    workers: matchedWorkers,
    employers: matchedEmployers,
    jobs: matchedJobs,
    projects: matchedProjects,
  };
};

