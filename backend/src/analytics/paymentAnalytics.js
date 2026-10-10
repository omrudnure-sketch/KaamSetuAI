import { Payment, Dispute, HiringAgreement } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getPaymentAnalytics = async (query = {}) => {
  const { startDate, endDate, dateRangeLabel } = parseDateRange(query);

  const matchFilter = {};
  if (startDate) {
    matchFilter.paymentDate = { $gte: startDate, $lte: endDate };
  }

  const [
    totalsByStatus,
    paymentTotalsByProject,
    paymentTotalsBySkill,
    paymentTotalsByLocation,
    disputeAmountsAgg,
    agreedWagesAgg,
  ] = await Promise.all([
    // Group payments by status (recorded, pending, disputed, cancelled)
    Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
    ]),

    // Group by Project
    Payment.aggregate([
      { $match: { ...matchFilter, status: 'recorded' } },
      {
        $group: {
          _id: '$projectId',
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
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
          totalPaid: 1,
          count: 1,
        },
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 },
    ]),

    // Group by Skill (lookup Project -> Job)
    Payment.aggregate([
      { $match: { ...matchFilter, status: 'recorded' } },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'projectDoc',
        },
      },
      { $unwind: { path: '$projectDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'projectDoc.jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: { path: '$jobDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$jobDoc.skillRequired', 'General'] },
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 },
    ]),

    // Group by Location (lookup Project)
    Payment.aggregate([
      { $match: { ...matchFilter, status: 'recorded' } },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'projectDoc',
        },
      },
      { $unwind: { path: '$projectDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$projectDoc.location.city', 'Unspecified'] },
          totalPaid: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 },
    ]),

    // Disputed payment amounts from Disputes model
    Dispute.aggregate([
      {
        $match: {
          type: 'payment',
          status: { $in: ['open', 'under_review', 'investigating', 'escalated'] },
        },
      },
      {
        $group: {
          _id: null,
          totalDisputedAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // Total agreed wage value from confirmed HiringAgreements
    HiringAgreement.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalAgreedWageValue: { $sum: { $ifNull: ['$agreedWage', '$proposedWage'] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Extract totals
  const statusMap = {};
  totalsByStatus.forEach((s) => {
    statusMap[s._id] = { total: s.totalAmount, count: s.count, avg: Math.round(s.avgAmount || 0) };
  });

  const recordedPaymentsAmount = statusMap['recorded']?.total || 0;
  const recordedPaymentsCount = statusMap['recorded']?.count || 0;
  const pendingPaymentsAmount = statusMap['pending']?.total || 0;
  const pendingPaymentsCount = statusMap['pending']?.count || 0;

  const disputedInPayments = statusMap['disputed']?.total || 0;
  const disputedInDisputes = disputeAmountsAgg[0]?.totalDisputedAmount || 0;
  const totalDisputedAmount = disputedInPayments + disputedInDisputes;

  const totalAgreedWageValue = agreedWagesAgg[0]?.totalAgreedWageValue || 0;
  const averagePayment = recordedPaymentsCount > 0 ? Math.round(recordedPaymentsAmount / recordedPaymentsCount) : 0;

  return {
    dateRange: dateRangeLabel,
    totals: {
      recordedAmount: recordedPaymentsAmount,
      recordedCount: recordedPaymentsCount,
      pendingAmount: pendingPaymentsAmount,
      pendingCount: pendingPaymentsCount,
      disputedAmount: totalDisputedAmount,
      averagePayment,
    },
    distinction: {
      totalAgreedWageValue,
      recordedWorkerWages: recordedPaymentsAmount,
      pendingWorkerWages: pendingPaymentsAmount,
      platformRevenue: 0,
      note: 'KaamSetu operates with zero platform commission on daily worker wages. Recorded payment amounts represent direct worker earnings and must NEVER be classified as platform revenue.',
    },
    byProject: paymentTotalsByProject.map((p) => ({
      projectId: p.projectId,
      name: p.projectName,
      amount: p.totalPaid,
      count: p.count,
    })),
    bySkill: paymentTotalsBySkill.map((s) => ({
      skill: s._id,
      amount: s.totalPaid,
      count: s.count,
    })),
    byLocation: paymentTotalsByLocation.map((l) => ({
      city: l._id,
      amount: l.totalPaid,
      count: l.count,
    })),
  };
};

export default getPaymentAnalytics;
