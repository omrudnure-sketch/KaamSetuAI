import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  HiringAgreement,
  Project,
  Payment,
  Complaint,
  Dispute,
} from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getOverviewAnalytics = async (query = {}) => {
  const { startDate, endDate, queryFilter, dateRangeLabel } = parseDateRange(query);

  const now = new Date();

  // Run all counts concurrently
  const [
    totalWorkers,
    activeWorkers,
    verifiedWorkers,
    totalEmployers,
    activeEmployers,
    totalJobsPeriod,
    totalJobsAllTime,
    openJobs,
    hiringAgreementsConfirmed,
    activeProjects,
    completedProjectsPeriod,
    completedProjectsAllTime,
    cancelledProjectsPeriod,
    closedProjectsPeriod,
    delayedProjects,
    pendingWorkerVerifications,
    pendingEmployerVerifications,
    openComplaints,
    openDisputes,
    recordedPaymentsAgg,
    pendingPaymentsAgg,
  ] = await Promise.all([
    // Workers
    User.countDocuments({ role: 'worker' }),
    User.countDocuments({ role: 'worker', status: 'active' }),
    WorkerProfile.countDocuments({ verificationStatus: 'verified' }),

    // Employers
    User.countDocuments({ role: 'employer' }),
    User.countDocuments({ role: 'employer', status: 'active' }),

    // Jobs
    Job.countDocuments(queryFilter),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),

    // Hiring agreements confirmed in period
    HiringAgreement.countDocuments({
      status: 'confirmed',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Active projects currently
    Project.countDocuments({
      status: { $in: ['in_progress', 'confirmed', 'completion_requested'] },
    }),

    // Completed projects in period
    Project.countDocuments({
      status: 'completed',
      ...(startDate ? { completedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Completed projects all time
    Project.countDocuments({ status: 'completed' }),

    // Cancelled projects in period
    Project.countDocuments({
      status: 'cancelled',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Closed projects in period
    Project.countDocuments({
      status: 'closed',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Delayed projects: expected end date has passed and project is not completed, closed, or cancelled
    Project.countDocuments({
      currentExpectedEndDate: { $lt: now, $ne: null },
      status: { $nin: ['completed', 'closed', 'cancelled'] },
    }),

    // Pending verifications
    WorkerProfile.countDocuments({ verificationStatus: 'pending' }),
    EmployerProfile.countDocuments({ verificationStatus: 'pending' }),

    // Open complaints
    Complaint.countDocuments({
      status: { $in: ['new', 'under_review', 'investigating', 'escalated'] },
    }),

    // Open disputes
    Dispute.countDocuments({
      status: { $in: ['open', 'under_review', 'investigating', 'awaiting_information', 'escalated'] },
    }),

    // Payments recorded in period
    Payment.aggregate([
      {
        $match: {
          status: 'recorded',
          ...(startDate ? { paymentDate: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Pending payments
    Payment.aggregate([
      {
        $match: {
          status: 'pending',
          ...(startDate ? { paymentDate: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const finishedCount = completedProjectsPeriod + cancelledProjectsPeriod + closedProjectsPeriod;
  const completionRateNum = finishedCount > 0 ? (completedProjectsPeriod / finishedCount) * 100 : (completedProjectsAllTime > 0 ? 100 : 0);
  const completionRate = `${Math.round(completionRateNum)}%`;

  const paymentsRecordedAmount = recordedPaymentsAgg[0]?.totalAmount || 0;
  const paymentsRecordedCount = recordedPaymentsAgg[0]?.count || 0;
  const pendingPaymentsAmount = pendingPaymentsAgg[0]?.totalAmount || 0;
  const pendingPaymentsCount = pendingPaymentsAgg[0]?.count || 0;

  return {
    dateRange: dateRangeLabel,
    startDate,
    endDate,
    metrics: {
      totalWorkers,
      activeWorkers,
      verifiedWorkers,
      totalEmployers,
      activeEmployers,
      totalJobs: totalJobsPeriod,
      totalJobsAllTime,
      openJobs,
      hiringAgreementsConfirmed,
      activeProjects,
      completedProjects: completedProjectsPeriod,
      delayedProjects,
      completionRate,
      pendingVerification: pendingWorkerVerifications + pendingEmployerVerifications,
      openComplaints,
      openDisputes,
      paymentsRecorded: {
        amount: paymentsRecordedAmount,
        count: paymentsRecordedCount,
      },
      pendingPayments: {
        amount: pendingPaymentsAmount,
        count: pendingPaymentsCount,
      },
    },
    metricDefinitions: {
      delayedProjects: 'Projects where current expected end date is in the past and status is not completed, closed, or cancelled.',
      completionRate: 'Completed projects divided by all concluded (completed, closed, cancelled) projects within the period.',
      activeWorkers: 'Registered workers whose account status is currently active.',
      openJobs: 'Jobs currently accepting applications with status open.',
      pendingVerification: 'Worker and employer profiles awaiting document review.',
    },
  };
};

export default getOverviewAnalytics;
