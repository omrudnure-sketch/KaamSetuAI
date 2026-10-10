import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  Project,
  Payment,
  Complaint,
  Dispute,
  VerificationRecord,
  AuditLog,
} from '../models/index.js';

export const getDashboardOverview = async () => {
  const now = new Date();

  const [
    totalWorkers,
    activeWorkers,
    verifiedWorkers,
    totalEmployers,
    activeEmployers,
    jobsPosted,
    activeJobs,
    activeProjects,
    completedProjects,
    pendingVerification,
    pendingComplaints,
    openDisputes,
    paymentsResult,
    delayedProjectsCount,
  ] = await Promise.all([
    WorkerProfile.countDocuments(),
    User.countDocuments({ role: 'worker', status: 'active' }),
    WorkerProfile.countDocuments({ isVerified: true }),
    EmployerProfile.countDocuments(),
    User.countDocuments({ role: 'employer', status: 'active' }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Project.countDocuments({ status: { $in: ['in_progress', 'created'] } }),
    Project.countDocuments({ status: 'completed' }),
    VerificationRecord.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: { $in: ['new', 'under_review', 'investigating'] } }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'investigating'] } }),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Project.countDocuments({
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { currentExpectedEndDate: { $lt: now, $ne: null } },
        { originalEstimatedEndDate: { $lt: now, $ne: null } },
        { expectedEndDate: { $lt: now, $ne: null } },
      ],
    }),
  ]);

  const totalProjects = activeProjects + completedProjects;
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const totalRecordedPayments = paymentsResult[0]?.total || 0;

  // Recent Activity Feed from Audit Logs
  const recentActivities = await AuditLog.find()
    .populate('adminId', 'name role')
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    kpis: {
      totalWorkers,
      activeWorkers,
      verifiedWorkers,
      totalEmployers,
      activeEmployers,
      jobsPosted,
      activeJobs,
      activeProjects,
      completedProjects,
      completionRate: `${completionRate}%`,
      pendingVerification,
      pendingComplaints,
      openDisputes,
      delayedProjectsCount,
      totalRecordedPayments,
    },
    activityFeed: recentActivities.map((a) => ({
      id: a._id,
      action: a.action,
      resourceType: a.targetType,
      adminName: a.adminId?.name || 'System',
      time: a.createdAt,
      details: a.details,
    })),
  };
};

export const getDelayedProjects = async () => {
  const now = new Date();
  const delayedProjects = await Project.find({
    status: { $nin: ['completed', 'cancelled'] },
    $or: [
      { currentExpectedEndDate: { $lt: now, $ne: null } },
      { originalEstimatedEndDate: { $lt: now, $ne: null } },
      { expectedEndDate: { $lt: now, $ne: null } },
    ],
  })
    .populate('employerId', 'name phone')
    .sort({ currentExpectedEndDate: 1, expectedEndDate: 1 });

  return delayedProjects;
};
