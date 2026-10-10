import {
  RiskFlag,
  User,
  Job,
  HiringAgreement,
  Project,
  Attendance,
  Review,
  Complaint,
  Dispute,
  AuditLog,
} from '../models/index.js';

/**
 * Maps a numerical score (0 - 100) to a deterministic risk level
 */
export function calculateRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * 1. Account Anomalies Check
 */
export async function checkAccountAnomalies(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const indicators = [];
  const evidenceReferences = [{ resourceType: 'User', resourceId: user._id, details: `User account: ${user.name}` }];

  // Rule 1.1: Rapid status shifts in AuditLog within last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const statusShiftLogs = await AuditLog.find({
    targetType: 'User',
    targetId: user._id,
    action: { $regex: /status/i },
    createdAt: { $gte: sevenDaysAgo },
  }).lean();

  if (statusShiftLogs.length >= 2) {
    indicators.push({
      code: 'RAPID_STATUS_SHIFTS',
      title: 'Rapid Account Status Shifts',
      description: `User experienced ${statusShiftLogs.length} administrative status changes in the past 7 days.`,
      points: 30,
      evidence: {
        changeCount: statusShiftLogs.length,
        logIds: statusShiftLogs.map((l) => l._id),
      },
    });
  }

  // Rule 1.2: Unverified user with unusually high job or application volume
  if (!user.isVerified) {
    const jobCount = await Job.countDocuments({ employerId: user._id });
    if (jobCount >= 5) {
      indicators.push({
        code: 'UNVERIFIED_HIGH_JOB_POSTINGS',
        title: 'Unverified Account High Posting Volume',
        description: `Unverified account has posted ${jobCount} jobs without completing verification.`,
        points: 25,
        evidence: { jobCount },
      });
    }
  }

  if (indicators.length === 0) return null;

  const score = Math.min(100, Math.max(0, indicators.reduce((acc, curr) => acc + curr.points, 0)));
  return {
    subjectUserId: user._id,
    relatedResourceType: 'user',
    relatedResourceId: user._id,
    riskCategory: 'account_anomaly',
    score,
    riskLevel: calculateRiskLevel(score),
    indicators,
    evidenceReferences,
  };
}

/**
 * 2. Job Posting Anomalies Check (for Employers)
 */
export async function checkJobAnomalies(employerId) {
  const employer = await User.findById(employerId).lean();
  if (!employer) return null;

  const indicators = [];
  const evidenceReferences = [{ resourceType: 'User', resourceId: employer._id, details: `Employer: ${employer.name}` }];

  const jobs = await Job.find({ employerId }).sort({ createdAt: -1 }).limit(30).lean();
  if (!jobs || jobs.length === 0) return null;

  // Rule 2.1: Rapid duplicate job postings (identical titles posted within 48h)
  const duplicateJobs = [];
  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const jobA = jobs[i];
      const jobB = jobs[j];
      const sameTitle = jobA.title.trim().toLowerCase() === jobB.title.trim().toLowerCase();
      const timeDiffMs = Math.abs(new Date(jobA.createdAt) - new Date(jobB.createdAt));
      const within48h = timeDiffMs <= 48 * 60 * 60 * 1000;

      if (sameTitle && within48h) {
        duplicateJobs.push({ jobA: jobA._id, jobB: jobB._id, title: jobA.title, timeDiffHours: Math.round(timeDiffMs / (3600000)) });
      }
    }
  }

  if (duplicateJobs.length >= 1) {
    indicators.push({
      code: 'RAPID_DUPLICATE_JOBS',
      title: 'Rapid Duplicate Job Postings',
      description: `Detected ${duplicateJobs.length} duplicate job posting pairs with identical titles published within 48 hours.`,
      points: 35,
      evidence: { duplicatePairs: duplicateJobs.slice(0, 5) },
    });
    duplicateJobs.slice(0, 3).forEach((d) => {
      evidenceReferences.push({ resourceType: 'Job', resourceId: d.jobA, details: `Duplicate job: ${d.title}` });
    });
  }

  // Rule 2.2: Repeated immediate job cancellations
  const cancelledJobs = jobs.filter((j) => j.status === 'cancelled');
  if (cancelledJobs.length >= 2 && (cancelledJobs.length / jobs.length) >= 0.4) {
    indicators.push({
      code: 'FREQUENT_JOB_CANCELLATIONS',
      title: 'Abnormally High Job Cancellation Rate',
      description: `${cancelledJobs.length} out of ${jobs.length} jobs (${Math.round((cancelledJobs.length / jobs.length) * 100)}%) were cancelled.`,
      points: 30,
      evidence: {
        totalJobs: jobs.length,
        cancelledCount: cancelledJobs.length,
        cancelledJobIds: cancelledJobs.map((j) => j._id),
      },
    });
    cancelledJobs.slice(0, 2).forEach((cj) => {
      evidenceReferences.push({ resourceType: 'Job', resourceId: cj._id, details: 'Cancelled job' });
    });
  }

  // Rule 2.3: Unusually high cancellation rate post-hiring (agreements/projects cancelled)
  const agreements = await HiringAgreement.find({ employerId }).limit(20).lean();
  const cancelledAgreements = agreements.filter((a) => a.status === 'cancelled' || a.status === 'rejected');
  if (cancelledAgreements.length >= 3) {
    indicators.push({
      code: 'HIGH_POST_HIRING_CANCELLATIONS',
      title: 'High Agreement Cancellation Pattern',
      description: `${cancelledAgreements.length} hiring agreements were cancelled or rejected for this employer.`,
      points: 25,
      evidence: {
        totalAgreements: agreements.length,
        cancelledCount: cancelledAgreements.length,
      },
    });
  }

  if (indicators.length === 0) return null;

  const score = Math.min(100, Math.max(0, indicators.reduce((acc, curr) => acc + curr.points, 0)));
  return {
    subjectUserId: employer._id,
    relatedResourceType: 'job',
    relatedResourceId: jobs[0]?._id || employer._id,
    riskCategory: 'job_posting_anomaly',
    score,
    riskLevel: calculateRiskLevel(score),
    indicators,
    evidenceReferences,
  };
}

/**
 * 3. Attendance Anomalies Check (for Workers)
 */
export async function checkAttendanceAnomalies(workerId) {
  const worker = await User.findById(workerId).lean();
  if (!worker) return null;

  const indicators = [];
  const evidenceReferences = [{ resourceType: 'User', resourceId: worker._id, details: `Worker: ${worker.name}` }];

  // Find attendance in the last 60 days
  const attendanceList = await Attendance.find({ workerId, status: 'present' }).sort({ date: -1 }).limit(50).lean();
  if (!attendanceList || attendanceList.length === 0) return null;

  // Rule 3.1: Conflicting attendance across different projects on the exact same calendar date
  const dateMap = {};
  attendanceList.forEach((att) => {
    if (!dateMap[att.date]) dateMap[att.date] = [];
    dateMap[att.date].push(att);
  });

  const conflictDates = [];
  Object.keys(dateMap).forEach((dateStr) => {
    const list = dateMap[dateStr];
    // Check if there are multiple attendances with different projectIds on same date
    const uniqueProjects = new Set(list.map((a) => a.projectId.toString()));
    if (uniqueProjects.size > 1) {
      conflictDates.push({
        date: dateStr,
        projectIds: Array.from(uniqueProjects),
        attendanceIds: list.map((a) => a._id),
      });
    }
  });

  if (conflictDates.length >= 1) {
    indicators.push({
      code: 'CONFLICTING_ATTENDANCE_SAME_DAY',
      title: 'Conflicting Multi-Project Attendance',
      description: `Worker recorded concurrent 'present' attendance on ${conflictDates.length} calendar day(s) across different projects.`,
      points: 45,
      evidence: { conflictDates: conflictDates.slice(0, 5) },
    });

    conflictDates.slice(0, 3).forEach((cd) => {
      cd.attendanceIds.forEach((attId) => {
        evidenceReferences.push({ resourceType: 'Attendance', resourceId: attId, details: `Conflicting attendance on ${cd.date}` });
      });
    });
  }

  if (indicators.length === 0) return null;

  const score = Math.min(100, Math.max(0, indicators.reduce((acc, curr) => acc + curr.points, 0)));
  return {
    subjectUserId: worker._id,
    relatedResourceType: 'attendance',
    relatedResourceId: attendanceList[0]?._id || worker._id,
    riskCategory: 'attendance_anomaly',
    score,
    riskLevel: calculateRiskLevel(score),
    indicators,
    evidenceReferences,
  };
}

/**
 * 4. Review Patterns Check
 */
export async function checkReviewPatterns(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const indicators = [];
  const evidenceReferences = [{ resourceType: 'User', resourceId: user._id, details: `User: ${user.name}` }];

  // Reviews written by this user
  const authoredReviews = await Review.find({ reviewerId: userId }).sort({ createdAt: -1 }).limit(30).lean();

  // Rule 4.1: Identical review text patterns across multiple reviews
  if (authoredReviews && authoredReviews.length >= 2) {
    const textMap = {};
    authoredReviews.forEach((rev) => {
      const trimmed = (rev.comment || '').trim().toLowerCase();
      if (trimmed.length >= 8) {
        if (!textMap[trimmed]) textMap[trimmed] = [];
        textMap[trimmed].push(rev);
      }
    });

    const duplicateComments = Object.keys(textMap).filter((text) => textMap[text].length >= 2);
    if (duplicateComments.length >= 1) {
      const matchingCount = duplicateComments.reduce((acc, t) => acc + textMap[t].length, 0);
      indicators.push({
        code: 'IDENTICAL_REVIEW_TEXT',
        title: 'Repetitive Copy-Pasted Review Text',
        description: `Author submitted ${matchingCount} reviews containing identical comment text across different engagements.`,
        points: 35,
        evidence: {
          duplicatePatternsCount: duplicateComments.length,
          sampleText: duplicateComments[0].substring(0, 60),
        },
      });

      duplicateComments.slice(0, 2).forEach((t) => {
        textMap[t].slice(0, 2).forEach((rev) => {
          evidenceReferences.push({ resourceType: 'Review', resourceId: rev._id, details: 'Identical review comment' });
        });
      });
    }
  }

  // Rule 4.2: Reciprocal review pattern (User A reviewed User B and User B reviewed User A)
  const receivedReviews = await Review.find({ revieweeId: userId }).lean();
  if (authoredReviews && authoredReviews.length > 0 && receivedReviews && receivedReviews.length > 0) {
    const reciprocalPairs = [];
    authoredReviews.forEach((revA) => {
      const match = receivedReviews.find((revB) => revB.reviewerId.toString() === revA.revieweeId.toString());
      if (match) {
        reciprocalPairs.push({
          reviewA: revA._id,
          reviewB: match._id,
          counterpartUserId: revA.revieweeId,
          ratingA: revA.rating,
          ratingB: match.rating,
        });
      }
    });

    if (reciprocalPairs.length >= 2) {
      indicators.push({
        code: 'RECIPROCAL_REVIEW_RING',
        title: 'Potential Reciprocal Review Exchange',
        description: `Detected ${reciprocalPairs.length} mutual 2-way review exchanges between this user and other counterpart accounts.`,
        points: 40,
        evidence: { reciprocalPairsCount: reciprocalPairs.length },
      });
    }
  }

  if (indicators.length === 0) return null;

  const score = Math.min(100, Math.max(0, indicators.reduce((acc, curr) => acc + curr.points, 0)));
  return {
    subjectUserId: user._id,
    relatedResourceType: 'review',
    relatedResourceId: authoredReviews[0]?._id || user._id,
    riskCategory: 'review_pattern',
    score,
    riskLevel: calculateRiskLevel(score),
    indicators,
    evidenceReferences,
  };
}

/**
 * 5. Payment & Dispute Patterns Check
 */
export async function checkPaymentDisputePatterns(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const indicators = [];
  const evidenceReferences = [{ resourceType: 'User', resourceId: user._id, details: `User: ${user.name}` }];

  // Find complaints where this user is the target
  const complaints = await Complaint.find({ targetUserId: userId }).sort({ createdAt: -1 }).limit(20).lean();

  // Find disputes where this user is the againstUser
  const disputes = await Dispute.find({ againstUserId: userId }).sort({ createdAt: -1 }).limit(20).lean();

  const unresolvedComplaints = complaints.filter((c) =>
    ['new', 'under_review', 'investigating', 'escalated'].includes(c.status)
  );
  const unresolvedDisputes = disputes.filter((d) =>
    ['open', 'under_review', 'investigating', 'awaiting_information', 'escalated'].includes(d.status)
  );

  const totalUnresolved = unresolvedComplaints.length + unresolvedDisputes.length;

  // Rule 5.1: Multiple unresolved complaints or disputes
  if (totalUnresolved >= 2) {
    indicators.push({
      code: 'MULTIPLE_UNRESOLVED_DISPUTES',
      title: 'Multiple Unresolved Complaints or Disputes',
      description: `User currently has ${unresolvedComplaints.length} active complaint(s) and ${unresolvedDisputes.length} active dispute(s) pending resolution.`,
      points: 40,
      evidence: {
        unresolvedComplaintsCount: unresolvedComplaints.length,
        unresolvedDisputesCount: unresolvedDisputes.length,
        complaintCategories: unresolvedComplaints.map((c) => c.category),
        disputeTypes: unresolvedDisputes.map((d) => d.type),
      },
    });

    unresolvedComplaints.slice(0, 2).forEach((c) => {
      evidenceReferences.push({ resourceType: 'Complaint', resourceId: c._id, details: `Active complaint (${c.category})` });
    });
    unresolvedDisputes.slice(0, 2).forEach((d) => {
      evidenceReferences.push({ resourceType: 'Dispute', resourceId: d._id, details: `Active dispute (${d.type})` });
    });
  }

  // Rule 5.2: Unusually high overall dispute frequency (total >= 4)
  const totalReports = complaints.length + disputes.length;
  if (totalReports >= 4) {
    indicators.push({
      code: 'HIGH_DISPUTE_FREQUENCY',
      title: 'High Overall Dispute & Complaint History',
      description: `User has accumulated ${totalReports} total grievances (${complaints.length} complaints, ${disputes.length} disputes) on the platform.`,
      points: 30,
      evidence: { totalReports, complaintsCount: complaints.length, disputesCount: disputes.length },
    });
  }

  if (indicators.length === 0) return null;

  const score = Math.min(100, Math.max(0, indicators.reduce((acc, curr) => acc + curr.points, 0)));
  return {
    subjectUserId: user._id,
    relatedResourceType: 'complaint',
    relatedResourceId: unresolvedComplaints[0]?._id || unresolvedDisputes[0]?._id || user._id,
    riskCategory: 'payment_dispute_pattern',
    score,
    riskLevel: calculateRiskLevel(score),
    indicators,
    evidenceReferences,
  };
}

/**
 * Persists or updates a risk flag record safely
 * CRITICAL SAFETY: NEVER penalizes or suspends the user automatically.
 */
export async function persistRiskFlag(evaluation) {
  if (!evaluation || !evaluation.indicators || evaluation.indicators.length === 0) {
    return null;
  }

  // Check if an active flag exists for this subject user & category
  const existingFlag = await RiskFlag.findOne({
    subjectUserId: evaluation.subjectUserId,
    riskCategory: evaluation.riskCategory,
    status: { $in: ['new', 'under_review'] },
  });

  if (existingFlag) {
    // Update existing flag
    existingFlag.score = evaluation.score;
    existingFlag.riskLevel = evaluation.riskLevel;
    existingFlag.indicators = evaluation.indicators;
    existingFlag.evidenceReferences = evaluation.evidenceReferences;
    existingFlag.relatedResourceType = evaluation.relatedResourceType;
    existingFlag.relatedResourceId = evaluation.relatedResourceId;
    await existingFlag.save();
    return existingFlag;
  }

  // Create new flag
  const newFlag = await RiskFlag.create({
    subjectUserId: evaluation.subjectUserId,
    relatedResourceType: evaluation.relatedResourceType,
    relatedResourceId: evaluation.relatedResourceId,
    riskCategory: evaluation.riskCategory,
    riskLevel: evaluation.riskLevel,
    score: evaluation.score,
    indicators: evaluation.indicators,
    evidenceReferences: evaluation.evidenceReferences,
    status: 'new',
  });

  return newFlag;
}

/**
 * Runs a complete evaluation for a single user across all anomaly vectors
 */
export async function evaluateUserRisk(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return [];

  const evaluations = [];

  // 1. Account anomalies
  const accountEval = await checkAccountAnomalies(userId);
  if (accountEval) evaluations.push(accountEval);

  // 2. Job anomalies (if employer or has posted jobs)
  if (user.role === 'employer') {
    const jobEval = await checkJobAnomalies(userId);
    if (jobEval) evaluations.push(jobEval);
  }

  // 3. Attendance anomalies (if worker)
  if (user.role === 'worker') {
    const attendanceEval = await checkAttendanceAnomalies(userId);
    if (attendanceEval) evaluations.push(attendanceEval);
  }

  // 4. Review patterns
  const reviewEval = await checkReviewPatterns(userId);
  if (reviewEval) evaluations.push(reviewEval);

  // 5. Payment & dispute patterns
  const disputeEval = await checkPaymentDisputePatterns(userId);
  if (disputeEval) evaluations.push(disputeEval);

  // Persist flags safely
  const savedFlags = [];
  for (const ev of evaluations) {
    const flag = await persistRiskFlag(ev);
    if (flag) savedFlags.push(flag);
  }

  return savedFlags;
}

/**
 * Batch scans active platform users for potential risk flags
 */
export async function scanPlatformRiskFlags({ limit = 50 } = {}) {
  const users = await User.find({ status: { $ne: 'blocked' } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  let flagsCreatedOrUpdated = 0;
  const flaggedResults = [];

  for (const user of users) {
    const flags = await evaluateUserRisk(user._id);
    if (flags.length > 0) {
      flagsCreatedOrUpdated += flags.length;
      flaggedResults.push({
        userId: user._id,
        userName: user.name,
        flagsCount: flags.length,
      });
    }
  }

  return {
    scannedUsersCount: users.length,
    flagsCreatedOrUpdated,
    flaggedResults,
  };
}

/**
 * Query risk flags with filtering and pagination
 */
export async function getRiskFlags({
  status,
  riskLevel,
  riskCategory,
  page = 1,
  limit = 20,
  search,
} = {}) {
  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }
  if (riskLevel && riskLevel !== 'all') {
    filter.riskLevel = riskLevel;
  }
  if (riskCategory && riskCategory !== 'all') {
    filter.riskCategory = riskCategory;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [flags, total] = await Promise.all([
    RiskFlag.find(filter)
      .populate('subjectUserId', 'name email phone role status isVerified')
      .populate('assignedAdminId', 'name email adminRole')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    RiskFlag.countDocuments(filter),
  ]);

  return {
    flags,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Get a single risk flag by ID
 */
export async function getRiskFlagById(flagId) {
  const flag = await RiskFlag.findById(flagId)
    .populate('subjectUserId', 'name email phone role status isVerified createdAt')
    .populate('assignedAdminId', 'name email adminRole')
    .populate('reviewNotes.adminId', 'name email')
    .lean();

  return flag;
}

/**
 * Updates a risk flag status and writes an AuditLog record
 */
export async function updateFlagStatus(flagId, { status, resolution = '' }, adminUser) {
  const flag = await RiskFlag.findById(flagId);
  if (!flag) {
    throw new Error('Risk flag not found');
  }

  const previousStatus = flag.status;
  flag.status = status;

  if (['resolved', 'dismissed', 'false_positive'].includes(status)) {
    flag.resolvedAt = new Date();
    flag.resolution = resolution;
  } else if (status === 'under_review') {
    if (!flag.assignedAdminId) {
      flag.assignedAdminId = adminUser._id;
    }
  }

  await flag.save();

  // Create AuditLog
  await AuditLog.create({
    adminId: adminUser._id,
    action: 'RISK_FLAG_STATUS_UPDATED',
    targetType: 'RiskFlag',
    targetId: flag._id,
    details: {
      previousStatus,
      newStatus: status,
      resolution,
      subjectUserId: flag.subjectUserId,
      riskCategory: flag.riskCategory,
      score: flag.score,
    },
  });

  return flag;
}

/**
 * Assigns an admin to a risk flag
 */
export async function assignAdminToFlag(flagId, assignedAdminId, adminUser) {
  const flag = await RiskFlag.findById(flagId);
  if (!flag) {
    throw new Error('Risk flag not found');
  }

  flag.assignedAdminId = assignedAdminId;
  if (flag.status === 'new') {
    flag.status = 'under_review';
  }
  await flag.save();

  await AuditLog.create({
    adminId: adminUser._id,
    action: 'RISK_FLAG_ASSIGNED',
    targetType: 'RiskFlag',
    targetId: flag._id,
    details: {
      assignedAdminId,
      assignedBy: adminUser._id,
    },
  });

  return flag;
}

/**
 * Adds an internal admin review note to a risk flag
 */
export async function addReviewNote(flagId, noteText, adminUser) {
  const flag = await RiskFlag.findById(flagId);
  if (!flag) {
    throw new Error('Risk flag not found');
  }

  flag.reviewNotes.push({
    adminId: adminUser._id,
    adminName: adminUser.name || 'Admin',
    note: noteText,
    createdAt: new Date(),
  });

  await flag.save();

  await AuditLog.create({
    adminId: adminUser._id,
    action: 'RISK_FLAG_NOTE_ADDED',
    targetType: 'RiskFlag',
    targetId: flag._id,
    details: {
      adminName: adminUser.name || 'Admin',
      noteLength: noteText.length,
    },
  });

  return flag;
}

/**
 * Aggregates statistics for admin dashboard
 */
export async function getRiskStatistics() {
  const [
    totalFlags,
    newFlags,
    underReviewFlags,
    highCriticalFlags,
    falsePositiveFlags,
    resolvedFlags,
    categories,
  ] = await Promise.all([
    RiskFlag.countDocuments(),
    RiskFlag.countDocuments({ status: 'new' }),
    RiskFlag.countDocuments({ status: 'under_review' }),
    RiskFlag.countDocuments({ riskLevel: { $in: ['high', 'critical'] }, status: { $in: ['new', 'under_review'] } }),
    RiskFlag.countDocuments({ status: 'false_positive' }),
    RiskFlag.countDocuments({ status: { $in: ['resolved', 'confirmed_issue'] } }),
    RiskFlag.aggregate([
      { $group: { _id: '$riskCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    totalFlags,
    newFlags,
    underReviewFlags,
    highCriticalFlags,
    falsePositiveFlags,
    resolvedFlags,
    categoryBreakdown: categories.map((c) => ({ category: c._id, count: c.count })),
  };
}

export default {
  calculateRiskLevel,
  checkAccountAnomalies,
  checkJobAnomalies,
  checkAttendanceAnomalies,
  checkReviewPatterns,
  checkPaymentDisputePatterns,
  persistRiskFlag,
  evaluateUserRisk,
  scanPlatformRiskFlags,
  getRiskFlags,
  getRiskFlagById,
  updateFlagStatus,
  assignAdminToFlag,
  addReviewNote,
  getRiskStatistics,
};
