import { User, WorkerProfile, EmployerProfile } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getUserAnalytics = async (query = {}) => {
  const { startDate, endDate, queryFilter, dateRangeLabel } = parseDateRange(query);
  const grouping = query.grouping || 'daily'; // 'daily', 'weekly', 'monthly'

  // Mongo date grouping format
  let dateFormat = '%Y-%m-%d';
  if (grouping === 'weekly') {
    dateFormat = '%Y-W%V';
  } else if (grouping === 'monthly') {
    dateFormat = '%Y-%m';
  }

  const [
    totalUsers,
    totalWorkers,
    totalEmployers,
    activeUsersCount,
    workerProfilesCount,
    employerProfilesCount,
    workerVerificationStats,
    employerVerificationStats,
    workerRegistrationsOverTime,
    employerRegistrationsOverTime,
    workerGeoDistribution,
    employerGeoDistribution,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'worker' }),
    User.countDocuments({ role: 'employer' }),

    // Active user definition: User with status 'active'
    User.countDocuments({ status: 'active' }),

    WorkerProfile.countDocuments(),
    EmployerProfile.countDocuments(),

    // Worker verification breakdown
    WorkerProfile.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]),

    // Employer verification breakdown
    EmployerProfile.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]),

    // Worker registrations over time
    User.aggregate([
      {
        $match: {
          role: 'worker',
          ...(startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Employer registrations over time
    User.aggregate([
      {
        $match: {
          role: 'employer',
          ...(startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Worker geographic distribution
    WorkerProfile.aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Employer geographic distribution
    EmployerProfile.aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Merge registrations over time
  const timeLabels = Array.from(
    new Set([
      ...workerRegistrationsOverTime.map((r) => r._id),
      ...employerRegistrationsOverTime.map((r) => r._id),
    ])
  ).sort();

  const registrationsTrend = timeLabels.map((period) => ({
    period,
    workers: workerRegistrationsOverTime.find((w) => w._id === period)?.count || 0,
    employers: employerRegistrationsOverTime.find((e) => e._id === period)?.count || 0,
  }));

  // Verified vs unverified
  const verifiedWorkers = workerVerificationStats.find((s) => s._id === 'verified')?.count || 0;
  const unverifiedWorkers = totalWorkers - verifiedWorkers;
  const verifiedEmployers = employerVerificationStats.find((s) => s._id === 'verified')?.count || 0;
  const unverifiedEmployers = totalEmployers - verifiedEmployers;

  // Profile completion ratios
  const workerProfileCompletionRate = totalWorkers > 0 ? Math.round((workerProfilesCount / totalWorkers) * 100) : 0;
  const employerProfileCompletionRate = totalEmployers > 0 ? Math.round((employerProfilesCount / totalEmployers) * 100) : 0;

  // Merge Geo Distribution
  const geoMap = {};
  workerGeoDistribution.forEach((w) => {
    const city = w._id || 'Unspecified';
    if (!geoMap[city]) geoMap[city] = { city, workers: 0, employers: 0 };
    geoMap[city].workers = w.count;
  });
  employerGeoDistribution.forEach((e) => {
    const city = e._id || 'Unspecified';
    if (!geoMap[city]) geoMap[city] = { city, workers: 0, employers: 0 };
    geoMap[city].employers = e.count;
  });

  return {
    dateRange: dateRangeLabel,
    grouping,
    totals: {
      totalUsers,
      totalWorkers,
      totalEmployers,
      activeUsers: activeUsersCount,
      activeDefinition: 'Users with account status = "active".',
    },
    profileCompletion: {
      workerProfiles: workerProfilesCount,
      workerProfileRate: `${workerProfileCompletionRate}%`,
      employerProfiles: employerProfilesCount,
      employerProfileRate: `${employerProfileCompletionRate}%`,
    },
    verification: {
      workers: { verified: verifiedWorkers, unverified: Math.max(0, unverifiedWorkers) },
      employers: { verified: verifiedEmployers, unverified: Math.max(0, unverifiedEmployers) },
    },
    registrationsTrend,
    geographicDistribution: Object.values(geoMap),
  };
};

export default getUserAnalytics;
