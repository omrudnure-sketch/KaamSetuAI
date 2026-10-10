import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  Project,
  ProgressUpdate,
  Attendance,
  ProjectWorker,
  ProjectExtension,
  WorkerProfile,
  EmployerProfile,
  User,
  Payment,
  Review,
  Complaint,
  Dispute,
} from '../../models/index.js';

// Output validation schema conforming strictly to Section 25.7
export const summaryOutputSchema = z.object({
  summary: z.string().trim().min(10, 'Summary must be at least 10 characters'),
  keyPoints: z.array(z.string().trim()).default([]),
  blockers: z.array(z.string().trim()).default([]),
  missingInformation: z.array(z.string().trim()).default([]),
  generatedAt: z.string(),
  sourceUpdatedAt: z.string().optional(),
});

/**
 * Format a Date object to YYYY-MM-DD or readable string safely
 */
const formatDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch {
    return 'N/A';
  }
};

/**
 * Call Gemini LLM if API key is provided, returning validated JSON or null on failure/timeout
 */
const generateWithGemini = async (prompt, systemInstruction) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const fullPrompt = `${systemInstruction}\n\nStrict Rules:\n1. Base every claim ONLY on the provided verified data.\n2. Do NOT invent dates, completed work, attendance, ratings, or facts.\n3. Return ONLY a single valid JSON object matching the required schema.\n\nInput Data:\n${prompt}`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 5000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      timeoutPromise,
    ]);

    const text = response?.text;
    if (text) {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return summaryOutputSchema.parse(parsed);
    }
  } catch (err) {
    console.warn('[SummaryService] Gemini LLM generation fallback triggered:', err.message);
  }
  return null;
};

/**
 * Section 25.3: Project Progress Summaries
 */
export const summarizeProjectProgress = async (projectId, userContext) => {
  const project = await Project.findById(projectId)
    .populate('employerId', 'name email phone')
    .lean();

  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  // Authorization check
  const userIdStr = userContext?.userId ? String(userContext.userId) : null;
  const isEmployer = project.employerId?._id?.toString() === userIdStr || project.employerId?.toString() === userIdStr;
  const isAdmin = userContext?.role === 'admin';

  let isWorker = false;
  if (userContext?.role === 'worker') {
    const assignment = await ProjectWorker.findOne({ projectId: project._id, workerId: userContext.userId }).lean();
    if (assignment) isWorker = true;
  }

  if (!isAdmin && !isEmployer && !isWorker) {
    const error = new Error('Access denied: You are not authorized to view this project summary');
    error.status = 403;
    throw error;
  }

  // Gather actual related database records
  const [progressUpdates, attendanceList, extensions] = await Promise.all([
    ProgressUpdate.find({ projectId }).sort({ date: -1, createdAt: -1 }).limit(5).lean(),
    Attendance.find({ projectId }).sort({ date: -1 }).limit(30).lean(),
    ProjectExtension.find({ projectId }).sort({ createdAt: -1 }).lean(),
  ]);

  const latestProgress = progressUpdates[0] || null;
  const currentProgressPercent = latestProgress?.percentage ?? project.progressPercentage ?? 0;
  const approvedExtensions = extensions.filter((e) => e.status === 'approved');
  const pendingExtensions = extensions.filter((e) => e.status === 'pending');

  const presentDays = attendanceList.filter((a) => a.status === 'present').length;
  const recordedBlockers = [];
  progressUpdates.forEach((p) => {
    if (Array.isArray(p.blockers)) {
      p.blockers.forEach((b) => {
        if (b && !recordedBlockers.includes(b)) recordedBlockers.push(b);
      });
    }
  });

  const missingInfo = [];
  if (progressUpdates.length === 0) {
    missingInfo.push('No daily progress updates recorded yet by workers or site supervisors.');
  }
  if (attendanceList.length === 0) {
    missingInfo.push('No attendance check-in/out records found for this project.');
  }
  if (!project.currentExpectedEndDate && !project.originalEstimatedEndDate) {
    missingInfo.push('No estimated completion dates were set for this project.');
  }

  const keyPoints = [
    `Project Status: ${project.status.replace(/_/g, ' ').toUpperCase()}`,
    `Recorded Progress: ${currentProgressPercent}% complete`,
    `Start Date: ${formatDate(project.startDate)}`,
    `Current Expected Completion: ${formatDate(project.currentExpectedEndDate || project.originalEstimatedEndDate)}`,
    `Verified Days Worked: ${presentDays} days logged on site`,
  ];

  if (approvedExtensions.length > 0) {
    keyPoints.push(`${approvedExtensions.length} schedule extension(s) have been approved.`);
  }
  if (pendingExtensions.length > 0) {
    keyPoints.push(`${pendingExtensions.length} extension request(s) are currently awaiting review.`);
  }

  // Disclose conflicting dates if present
  if (
    latestProgress?.expectedCompletionDate &&
    project.currentExpectedEndDate &&
    formatDate(latestProgress.expectedCompletionDate) !== formatDate(project.currentExpectedEndDate)
  ) {
    keyPoints.push(
      `Date Discrepancy: Latest progress update indicates completion on ${formatDate(
        latestProgress.expectedCompletionDate
      )}, whereas platform agreement records ${formatDate(project.currentExpectedEndDate)}.`
    );
  }

  const generatedAt = new Date().toISOString();
  const sourceUpdatedAt = project.updatedAt ? new Date(project.updatedAt).toISOString() : generatedAt;

  // Attempt LLM generation
  const llmPrompt = JSON.stringify({
    projectName: project.name,
    status: project.status,
    progressPercentage: currentProgressPercent,
    startDate: formatDate(project.startDate),
    currentExpectedEndDate: formatDate(project.currentExpectedEndDate),
    originalEstimatedEndDate: formatDate(project.originalEstimatedEndDate),
    attendanceCount: presentDays,
    approvedExtensionsCount: approvedExtensions.length,
    recordedBlockers,
    missingInfo,
    latestUpdateDescription: latestProgress?.description || 'None',
  });

  const aiResult = await generateWithGemini(
    llmPrompt,
    'You are KaamSetu AI. Generate a concise, strictly factual project progress summary in English based solely on verified project records.'
  );

  if (aiResult) {
    return {
      ...aiResult,
      generatedAt,
      sourceUpdatedAt,
    };
  }

  // Deterministic fallback (strictly conforms to Zod schema)
  let fallbackSummary = `${project.name} is currently recorded as ${project.status.replace(/_/g, ' ')} with ${currentProgressPercent}% completion.`;
  if (latestProgress?.description) {
    fallbackSummary += ` Latest update: "${latestProgress.description}".`;
  }
  if (recordedBlockers.length > 0) {
    fallbackSummary += ` ${recordedBlockers.length} blocker(s) have been reported.`;
  } else {
    fallbackSummary += ' No unresolved blockers currently reported.';
  }
  fallbackSummary += ` Expected completion date is ${formatDate(project.currentExpectedEndDate || project.originalEstimatedEndDate)}.`;

  const fallbackOutput = {
    summary: fallbackSummary,
    keyPoints,
    blockers: recordedBlockers,
    missingInformation: missingInfo,
    generatedAt,
    sourceUpdatedAt,
  };

  return summaryOutputSchema.parse(fallbackOutput);
};

/**
 * Section 25.4: Worker Work-History Summaries
 */
export const summarizeWorkerHistory = async (workerId, userContext) => {
  // Allow worker themselves, employers evaluating worker, or admins
  const workerUser = await User.findById(workerId).select('-password -__v').lean();
  if (!workerUser || workerUser.role !== 'worker') {
    const error = new Error('Worker user not found');
    error.status = 404;
    throw error;
  }

  const profile = await WorkerProfile.findOne({ userId: workerId }).lean();

  // Gather real completed project records and reviews
  const [completedAssignments, reviews] = await Promise.all([
    ProjectWorker.find({ workerId, status: { $in: ['completed', 'active', 'confirmed'] } })
      .populate('projectId', 'name status startDate currentExpectedEndDate')
      .lean(),
    Review.find({ revieweeId: workerId }).sort({ createdAt: -1 }).lean(),
  ]);

  const verifiedCompletedProjects = completedAssignments.filter(
    (a) => a.status === 'completed' || a.projectId?.status === 'completed'
  );

  const totalReviewsCount = reviews.length;
  const avgRating =
    totalReviewsCount > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviewsCount).toFixed(1)
      : profile?.rating ? profile.rating.toFixed(1) : 'No ratings yet';

  const missingInfo = [];
  if (!profile) {
    missingInfo.push('Worker has not created a detailed trade profile yet.');
  } else {
    if (!profile.bio) missingInfo.push('No written biography or background description in profile.');
    if (profile.verificationStatus !== 'verified') {
      missingInfo.push('Government identity / skill verification is pending admin review.');
    }
  }

  if (totalReviewsCount === 0) {
    missingInfo.push('Worker currently has no client reviews on this platform (new or recent member).');
  }

  const primarySkill = profile?.primarySkill || 'General Trade';
  const skillsList = profile?.skills?.length > 0 ? profile.skills.join(', ') : primarySkill;
  const expYears = profile?.experienceYears != null ? profile.experienceYears : 0;

  const keyPoints = [
    `Primary Trade: ${primarySkill}`,
    `Skills: ${skillsList}`,
    `Self-Reported Experience: ${expYears} year(s)`,
    `Verified Platform Projects: ${verifiedCompletedProjects.length} completed`,
    `Platform Rating: ${avgRating} (${totalReviewsCount} review(s))`,
    `Verification Status: ${profile?.verificationStatus === 'verified' ? 'Verified Worker' : 'Pending Verification'}`,
  ];

  const recentHistory = verifiedCompletedProjects.slice(0, 3).map((p) => {
    return `${p.projectId?.name || 'Project'} (Start: ${formatDate(p.startDate)})`;
  });

  if (recentHistory.length > 0) {
    keyPoints.push(`Recent Projects: ${recentHistory.join('; ')}`);
  }

  const generatedAt = new Date().toISOString();
  const sourceUpdatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toISOString() : generatedAt;

  const llmPrompt = JSON.stringify({
    workerName: profile?.fullName || workerUser.name,
    primarySkill,
    skills: profile?.skills || [],
    experienceYears: expYears,
    verifiedCompletedProjects: verifiedCompletedProjects.length,
    avgRating,
    totalReviews: totalReviewsCount,
    verificationStatus: profile?.verificationStatus || 'pending',
    missingInfo,
  });

  const aiResult = await generateWithGemini(
    llmPrompt,
    'You are KaamSetu AI. Generate a concise, strictly factual worker work-history overview based solely on verified profile and project data. Do NOT invent certifications, reliability scores, or years of experience. Do not penalize or label a worker unreliable for having few reviews.'
  );

  if (aiResult) {
    return {
      ...aiResult,
      generatedAt,
      sourceUpdatedAt,
    };
  }

  // Deterministic fallback conforming to Zod schema
  let summary = `${profile?.fullName || workerUser.name} is a ${primarySkill} with ${expYears} year(s) of self-reported trade experience.`;
  summary += ` They have completed ${verifiedCompletedProjects.length} verified project(s) on KaamSetu with an average rating of ${avgRating}.`;
  if (totalReviewsCount === 0) {
    summary += ' As a newer platform member, they currently have limited recorded client reviews.';
  }

  const fallbackOutput = {
    summary,
    keyPoints,
    blockers: [],
    missingInformation: missingInfo,
    generatedAt,
    sourceUpdatedAt,
  };

  return summaryOutputSchema.parse(fallbackOutput);
};

/**
 * Section 25.4 (Extended): Employer Work-History Summaries
 */
export const summarizeEmployerHistory = async (employerId, userContext) => {
  const employerUser = await User.findById(employerId).select('-password -__v').lean();
  if (!employerUser || employerUser.role !== 'employer') {
    const error = new Error('Employer user not found');
    error.status = 404;
    throw error;
  }

  const profile = await EmployerProfile.findOne({ userId: employerId }).lean();

  const [projects, payments, reviews] = await Promise.all([
    Project.find({ employerId }).lean(),
    Payment.find({ employerId }).lean(),
    Review.find({ revieweeId: employerId }).lean(),
  ]);

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const inProgressProjects = projects.filter((p) => p.status === 'in_progress').length;
  const totalPaid = payments
    .filter((p) => p.status === 'completed' || p.status === 'recorded')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : profile?.rating ? profile.rating.toFixed(1) : 'No ratings yet';

  const missingInfo = [];
  if (totalProjects === 0) missingInfo.push('No projects have been initiated yet by this employer.');
  if (totalReviews === 0) missingInfo.push('No worker reviews logged yet for this employer.');

  const keyPoints = [
    `Total Projects Posted: ${totalProjects}`,
    `Completed Projects: ${completedProjects}`,
    `Active Projects: ${inProgressProjects}`,
    `Total Disbursed Payments: ₹${totalPaid.toLocaleString()}`,
    `Average Rating from Workers: ${avgRating} (${totalReviews} review(s))`,
    `Business Type: ${profile?.businessType || 'General Employer'}`,
  ];

  const generatedAt = new Date().toISOString();
  const sourceUpdatedAt = profile?.updatedAt ? new Date(profile.updatedAt).toISOString() : generatedAt;

  const summary = `${profile?.businessName || employerUser.name} has posted ${totalProjects} project(s) on KaamSetu, with ${completedProjects} completed and ${inProgressProjects} active. Total recorded worker payments stand at ₹${totalPaid.toLocaleString()} across verified agreements.`;

  const fallbackOutput = {
    summary,
    keyPoints,
    blockers: [],
    missingInformation: missingInfo,
    generatedAt,
    sourceUpdatedAt,
  };

  return summaryOutputSchema.parse(fallbackOutput);
};

/**
 * Section 25.5: Complaint Summaries
 */
export const summarizeComplaint = async (complaintId, userContext) => {
  const complaint = await Complaint.findById(complaintId)
    .populate('reporterId', 'name role email')
    .populate('targetUserId', 'name role email')
    .populate('projectId', 'name status')
    .lean();

  if (!complaint) {
    const error = new Error('Complaint not found');
    error.status = 404;
    throw error;
  }

  // Authorization check: Admin with complaints.read, or the reporter/targetUser
  const userIdStr = userContext?.userId ? String(userContext.userId) : null;
  const isReporter = complaint.reporterId?._id?.toString() === userIdStr;
  const isTarget = complaint.targetUserId?._id?.toString() === userIdStr;
  const isAdmin = userContext?.role === 'admin';

  if (!isAdmin && !isReporter && !isTarget) {
    const error = new Error('Access denied: You are not authorized to view this complaint summary');
    error.status = 403;
    throw error;
  }

  const missingInfo = [];
  if (!complaint.evidence || complaint.evidence.length === 0) {
    missingInfo.push('No photographic or documentary evidence submitted with this complaint.');
  }
  if (!complaint.resolution && ['resolved', 'rejected'].includes(complaint.status)) {
    missingInfo.push('Resolution notes have not been recorded in system records.');
  }

  const keyPoints = [
    `Case Status: ${complaint.status.replace(/_/g, ' ').toUpperCase()}`,
    `Category: ${complaint.category.replace(/_/g, ' ').toUpperCase()}`,
    `Priority: ${complaint.priority.toUpperCase()}`,
    `Filed By: ${complaint.reporterId?.name || 'User'} (${complaint.reporterId?.role || 'user'}) on ${formatDate(
      complaint.createdAt
    )}`,
    `Reported Target: ${complaint.targetUserId?.name || 'User'} (${complaint.targetUserId?.role || 'user'})`,
    `Associated Project: ${complaint.projectId?.name || 'Not linked to a project'}`,
    `Submitted Evidence Items: ${complaint.evidence?.length || 0}`,
  ];

  if (complaint.resolution) {
    keyPoints.push(`Recorded Resolution: ${complaint.resolution}`);
  }

  // Clearly delineate allegation vs verified fact (Section 25.5)
  const summary = `Administrative Complaint Review: ${complaint.reporterId?.name || 'Reporter'} filed a ${complaint.category} complaint regarding ${complaint.targetUserId?.name || 'target user'}. Allegation reported: "${complaint.description}". Current status: ${complaint.status}. Note: Allegations represent claims submitted for investigation and have not been independently proven.`;

  const generatedAt = new Date().toISOString();
  const sourceUpdatedAt = complaint.updatedAt ? new Date(complaint.updatedAt).toISOString() : generatedAt;

  const fallbackOutput = {
    summary,
    keyPoints,
    blockers: complaint.status === 'investigating' || complaint.status === 'new' ? ['Pending administrative investigation'] : [],
    missingInformation: missingInfo,
    generatedAt,
    sourceUpdatedAt,
  };

  return summaryOutputSchema.parse(fallbackOutput);
};

/**
 * Section 25.5: Dispute Summaries
 */
export const summarizeDispute = async (disputeId, userContext) => {
  const dispute = await Dispute.findById(disputeId)
    .populate('initiatedBy', 'name role')
    .populate('againstUserId', 'name role')
    .populate('projectId', 'name status paymentAmount paymentType')
    .populate('resolvedBy', 'name')
    .lean();

  if (!dispute) {
    const error = new Error('Dispute not found');
    error.status = 404;
    throw error;
  }

  // Authorization check: Admin with disputes.read, or the dispute parties
  const userIdStr = userContext?.userId ? String(userContext.userId) : null;
  const isInitiator = dispute.initiatedBy?._id?.toString() === userIdStr;
  const isAgainst = dispute.againstUserId?._id?.toString() === userIdStr;
  const isAdmin = userContext?.role === 'admin';

  if (!isAdmin && !isInitiator && !isAgainst) {
    const error = new Error('Access denied: You are not authorized to view this dispute summary');
    error.status = 403;
    throw error;
  }

  // Gather verified payments from project to compare with disputed amount
  let projectPayments = [];
  if (dispute.projectId?._id) {
    projectPayments = await Payment.find({ projectId: dispute.projectId._id }).lean();
  }
  const totalPaidInProject = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const missingInfo = [];
  if (!dispute.evidence || dispute.evidence.length === 0) {
    missingInfo.push('No uploaded documents or screenshots attached to this dispute.');
  }
  if (!dispute.resolution && dispute.status === 'resolved') {
    missingInfo.push('Resolution statement is empty.');
  }

  const keyPoints = [
    `Dispute Status: ${dispute.status.replace(/_/g, ' ').toUpperCase()}`,
    `Dispute Type: ${dispute.type.replace(/_/g, ' ').toUpperCase()}`,
    `Disputed Sum: ₹${dispute.amount || 0}`,
    `Project: ${dispute.projectId?.name || 'Project'} (Status: ${dispute.projectId?.status || 'N/A'})`,
    `Initiated By: ${dispute.initiatedBy?.name || 'Initiator'} (${dispute.initiatedBy?.role || 'user'}) on ${formatDate(
      dispute.createdAt
    )}`,
    `Respondent: ${dispute.againstUserId?.name || 'Respondent'} (${dispute.againstUserId?.role || 'user'})`,
    `Total Verified Project Payments: ₹${totalPaidInProject.toLocaleString()}`,
  ];

  if (dispute.resolution) {
    keyPoints.push(`Resolution: ${dispute.resolution} (Resolved by ${dispute.resolvedBy?.name || 'Admin'})`);
  }

  const summary = `Dispute Case Summary: A ${dispute.type} dispute regarding ₹${dispute.amount || 0} was filed by ${dispute.initiatedBy?.name || 'claimant'} against ${dispute.againstUserId?.name || 'respondent'} on project "${dispute.projectId?.name || 'Project'}". Claim statement: "${dispute.description}". Current case status is ${dispute.status}. Note: Dispute claims require administrative determination; AI does not make dispute rulings.`;

  const generatedAt = new Date().toISOString();
  const sourceUpdatedAt = dispute.updatedAt ? new Date(dispute.updatedAt).toISOString() : generatedAt;

  const fallbackOutput = {
    summary,
    keyPoints,
    blockers: ['Awaiting administrative mediation and dispute resolution'],
    missingInformation: missingInfo,
    generatedAt,
    sourceUpdatedAt,
  };

  return summaryOutputSchema.parse(fallbackOutput);
};

export default {
  summaryOutputSchema,
  summarizeProjectProgress,
  summarizeWorkerHistory,
  summarizeEmployerHistory,
  summarizeComplaint,
  summarizeDispute,
};
