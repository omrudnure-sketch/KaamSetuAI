import { Project, ProjectExtension } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getProjectAnalytics = async (query = {}) => {
  const { startDate, endDate, queryFilter, dateRangeLabel } = parseDateRange(query);
  const now = new Date();

  const [
    statusDistributionRaw,
    delayedProjectsList,
    avgProgressResult,
    extensionStats,
    durationAgg,
    completionTrends,
    cityDistribution,
    categoryDistribution,
  ] = await Promise.all([
    // Status distribution
    Project.aggregate([
      ...(startDate ? [{ $match: { createdAt: { $gte: startDate, $lte: endDate } } }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Delayed projects details
    Project.find({
      currentExpectedEndDate: { $lt: now, $ne: null },
      status: { $nin: ['completed', 'closed', 'cancelled'] },
    })
      .select('name status startDate currentExpectedEndDate progressPercentage location')
      .populate('employerId', 'name')
      .limit(20)
      .lean(),

    // Average progress percentage of active/in_progress projects
    Project.aggregate([
      { $match: { status: { $in: ['in_progress', 'confirmed', 'completion_requested'] } } },
      { $group: { _id: null, avgProgress: { $avg: '$progressPercentage' } } },
    ]),

    // Extension frequency
    Promise.all([
      ProjectExtension.countDocuments(),
      Project.countDocuments(),
      ProjectExtension.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]),

    // Project duration: difference between startDate and completedAt (or currentExpectedEndDate)
    Project.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $ne: null },
          startDate: { $ne: null },
          ...(startDate ? { completedAt: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $project: {
          durationDays: {
            $divide: [
              { $subtract: ['$completedAt', '$startDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      { $match: { durationDays: { $gte: 0 } } },
      {
        $group: {
          _id: null,
          avgDurationDays: { $avg: '$durationDays' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Completion trends over time
    Project.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $ne: null },
          ...(startDate ? { completedAt: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Projects by City
    Project.aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Projects by Skill / Category (lookup Job)
    Project.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: { path: '$jobDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$jobDoc.skillRequired', 'general'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const [totalExtensions, totalProjectsCount, extensionBreakdown] = extensionStats;

  // Format status distribution
  const statusCounts = {};
  statusDistributionRaw.forEach((s) => {
    statusCounts[s._id] = s.count;
  });

  const activeProjects = (statusCounts['in_progress'] || 0) + (statusCounts['confirmed'] || 0) + (statusCounts['completion_requested'] || 0);
  const completedProjects = statusCounts['completed'] || 0;
  const cancelledProjects = statusCounts['cancelled'] || 0;
  const closedProjects = statusCounts['closed'] || 0;

  const avgProgress = Math.round(avgProgressResult[0]?.avgProgress || 0);
  const avgDurationDays = Math.round((durationAgg[0]?.avgDurationDays || 0) * 10) / 10;
  const extensionRatio = totalProjectsCount > 0 ? (totalExtensions / totalProjectsCount).toFixed(2) : 0;

  return {
    dateRange: dateRangeLabel,
    statusDistribution: {
      active: activeProjects,
      completed: completedProjects,
      cancelled: cancelledProjects,
      closed: closedProjects,
      raw: statusDistributionRaw,
    },
    delayedProjects: {
      count: delayedProjectsList.length,
      definition: 'currentExpectedEndDate has passed and project is not completed, closed, or cancelled.',
      list: delayedProjectsList.map((p) => ({
        id: p._id,
        name: p.name,
        employer: p.employerId?.name || 'N/A',
        status: p.status,
        progress: `${p.progressPercentage || 0}%`,
        expectedEnd: p.currentExpectedEndDate ? new Date(p.currentExpectedEndDate).toISOString().split('T')[0] : 'N/A',
        city: p.location?.city || 'Unspecified',
      })),
    },
    metrics: {
      averageProgress: `${avgProgress}%`,
      averageDurationDays: `${avgDurationDays} days`,
      totalExtensions,
      extensionsPerProject: extensionRatio,
      extensionBreakdown,
    },
    completionTrends,
    groupedByCity: cityDistribution.map((c) => ({ city: c._id || 'Unspecified', count: c.count })),
    groupedByCategory: categoryDistribution.map((cat) => ({ category: cat._id, count: cat.count })),
  };
};

export default getProjectAnalytics;
