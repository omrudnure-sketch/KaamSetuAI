import {
  User,
  WorkerProfile,
  Job,
  JobApplication,
  HiringAgreement,
  Project,
} from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getHiringAnalytics = async (query = {}) => {
  const { startDate, endDate, queryFilter, dateRangeLabel } = parseDateRange(query);

  const [
    registeredUsers,
    completedProfiles,
    verifiedWorkers,
    jobsCreated,
    cancelledJobs,
    applicationsSubmitted,
    selectedApplications,
    confirmedAgreements,
    startedProjects,
    completedProjects,
    totalProjects,
    repeatEmployers,
    timeToHireAgg,
  ] = await Promise.all([
    // Stage 1: Registration
    User.countDocuments(queryFilter),

    // Stage 2: Profile Completion
    WorkerProfile.countDocuments(queryFilter),

    // Stage 3: Verification
    WorkerProfile.countDocuments({
      verificationStatus: 'verified',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Stage 4: Job Creation
    Job.countDocuments(queryFilter),

    // Cancelled jobs
    Job.countDocuments({
      status: 'cancelled',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Stage 5: Applications
    JobApplication.countDocuments(queryFilter),

    // Stage 6: Selection
    JobApplication.countDocuments({
      status: 'selected',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Stage 7: Hiring Confirmation
    HiringAgreement.countDocuments({
      status: 'confirmed',
      ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Stage 8: Project Start
    Project.countDocuments({
      status: { $in: ['in_progress', 'confirmed', 'completion_requested', 'completed'] },
      ...(startDate ? { startDate: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Stage 9: Project Completion
    Project.countDocuments({
      status: 'completed',
      ...(startDate ? { completedAt: { $gte: startDate, $lte: endDate } } : {}),
    }),

    // Total projects for completion rate
    Project.countDocuments(queryFilter),

    // Stage 10: Repeat Hiring (Employers with >1 confirmed hiring agreement)
    HiringAgreement.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$employerId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'repeatEmployersCount' },
    ]),

    // Average time to hire: lookup Job createdAt to HiringAgreement confirmed updatedAt
    HiringAgreement.aggregate([
      {
        $match: {
          status: 'confirmed',
          ...(startDate ? { updatedAt: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: '$jobDoc' },
      {
        $project: {
          diffHours: {
            $divide: [
              { $subtract: ['$updatedAt', '$jobDoc.createdAt'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      { $match: { diffHours: { $gte: 0 } } },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$diffHours' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const repeatHiringCount = repeatEmployers[0]?.repeatEmployersCount || 0;

  // Stages array
  const rawStages = [
    { name: 'Registration', count: registeredUsers },
    { name: 'Profile Completion', count: completedProfiles },
    { name: 'Verification', count: verifiedWorkers },
    { name: 'Job Creation', count: jobsCreated },
    { name: 'Applications', count: applicationsSubmitted },
    { name: 'Selection', count: selectedApplications },
    { name: 'Hiring Confirmation', count: confirmedAgreements },
    { name: 'Project Start', count: startedProjects },
    { name: 'Project Completion', count: completedProjects },
    { name: 'Repeat Hiring', count: repeatHiringCount },
  ];

  // Calculate conversion rates and drop-off rates between adjacent stages
  const funnel = rawStages.map((stage, idx) => {
    const prevCount = idx === 0 ? stage.count : rawStages[idx - 1].count;
    const conversionRate = prevCount > 0 ? Math.min(100, Math.round((stage.count / prevCount) * 100)) : 0;
    const dropOffRate = prevCount > 0 ? Math.max(0, 100 - conversionRate) : 0;
    return {
      stage: stage.name,
      count: stage.count,
      conversionRate: `${conversionRate}%`,
      dropOffRate: `${dropOffRate}%`,
    };
  });

  // Overall hiring conversion (confirmed hires / jobs created)
  const hiringConversionRate = jobsCreated > 0
    ? `${Math.round((confirmedAgreements / jobsCreated) * 100)}%`
    : '0%';

  // Job cancellation rate
  const jobCancellationRate = jobsCreated > 0
    ? `${Math.round((cancelledJobs / jobsCreated) * 100)}%`
    : '0%';

  // Project completion rate
  const projectCompletionRate = totalProjects > 0
    ? `${Math.round((completedProjects / totalProjects) * 100)}%`
    : '0%';

  // Average time to hire
  const avgHours = timeToHireAgg[0]?.avgHours;
  const avgTimeToHire = avgHours !== undefined && avgHours !== null
    ? (avgHours < 24 ? `${Math.round(avgHours * 10) / 10} hours` : `${Math.round((avgHours / 24) * 10) / 10} days`)
    : 'N/A (Pending timestamp records)';

  return {
    dateRange: dateRangeLabel,
    funnel,
    metrics: {
      hiringConversionRate,
      jobCancellationRate,
      projectCompletionRate,
      avgTimeToHire,
      repeatHiringCount,
    },
    formulas: {
      conversionRate: 'Count at current stage / Count at preceding stage * 100',
      dropOffRate: '100% - conversionRate',
      hiringConversion: 'Confirmed agreements / Jobs created * 100',
      avgTimeToHire: 'Average hours between Job posting createdAt and HiringAgreement confirmed timestamp',
      jobCancellationRate: 'Cancelled jobs / Total jobs created * 100',
      projectCompletionRate: 'Completed projects / Total projects * 100',
    },
    limitations: 'Average time to hire measures jobs with matched confirmed hiring agreements in the selected period. Unlinked legacy records are omitted from duration averages.',
  };
};

export default getHiringAnalytics;
