import { Attendance } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getAttendanceAnalytics = async (query = {}) => {
  const { startDate, endDate, dateRangeLabel } = parseDateRange(query);

  const matchFilter = {};
  if (startDate) {
    // Attendance model has 'date' string formatted as 'YYYY-MM-DD' or createdAt timestamp
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    matchFilter.date = { $gte: startStr, $lte: endStr };
  }

  const [
    statusBreakdown,
    attendanceByDate,
    attendanceByProject,
    attendanceByWorker,
  ] = await Promise.all([
    // Status breakdown (present, absent, half_day, leave)
    Attendance.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Attendance trends by date
    Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$date',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),

    // Attendance grouped by project
    Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$projectId',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'projectDoc',
        },
      },
      { $unwind: { path: '$projectDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          projectId: '$_id',
          projectName: { $ifNull: ['$projectDoc.name', 'Unnamed Project'] },
          city: { $ifNull: ['$projectDoc.location.city', 'Unspecified'] },
          total: 1,
          present: 1,
          rate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),

    // Attendance grouped by top active workers
    Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$workerId',
          totalRecords: { $sum: 1 },
          presentRecords: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'workerDoc',
        },
      },
      { $unwind: { path: '$workerDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          workerId: '$_id',
          workerName: { $ifNull: ['$workerDoc.name', 'Unknown Worker'] },
          totalRecords: 1,
          presentRecords: 1,
        },
      },
      { $sort: { totalRecords: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const counts = {
    present: 0,
    absent: 0,
    half_day: 0,
    leave: 0,
  };

  statusBreakdown.forEach((s) => {
    if (counts[s._id] !== undefined) {
      counts[s._id] = s.count;
    }
  });

  const total = counts.present + counts.absent + counts.half_day + counts.leave;
  // Standard attendance rate: (present + 0.5 * half_day) / total
  const attendanceRate = total > 0 ? Math.round(((counts.present + 0.5 * counts.half_day) / total) * 100) : 0;

  return {
    dateRange: dateRangeLabel,
    records: {
      present: counts.present,
      absent: counts.absent,
      halfDay: counts.half_day,
      leave: counts.leave,
      total,
      attendanceRate: `${attendanceRate}%`,
      rateFormula: '(present + 0.5 * half_day) / total * 100. Unique compound index on [projectWorkerId, date] prevents duplicates.',
    },
    byDate: attendanceByDate,
    byProject: attendanceByProject,
    byWorker: attendanceByWorker,
  };
};

export default getAttendanceAnalytics;
