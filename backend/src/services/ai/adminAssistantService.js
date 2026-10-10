import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  JobApplication,
  HiringAgreement,
  Project,
  Attendance,
  Payment,
  Complaint,
  Dispute,
  VerificationRecord,
  AdminAssistantConversation,
} from '../../models/index.js';
import { getDashboardOverview, getDelayedProjects } from '../adminDashboardService.js';
import { getSkillAnalytics } from '../../analytics/skillAnalytics.js';
import { getHiringAnalytics } from '../../analytics/hiringAnalytics.js';
import { getPaymentAnalytics } from '../../analytics/paymentAnalytics.js';
import { getAttendanceAnalytics } from '../../analytics/attendanceAnalytics.js';

// Section 26.4: Intent validation schema with Zod
export const adminAssistantIntentSchema = z
  .object({
    intent: z.enum([
      'dashboard_overview',
      'delayed_projects',
      'skill_demand_supply',
      'available_workers',
      'hiring_conversion',
      'verification_backlog',
      'attendance_summary',
      'payment_summary',
      'open_complaints',
      'open_disputes',
      'cancellation_summary',
      'action_request',
      'unknown',
    ]),
    filters: z
      .object({
        city: z.string().trim().max(60).optional(),
        skill: z.string().trim().toLowerCase().max(60).optional(),
        dateRange: z.string().trim().max(30).optional(),
        status: z.string().trim().max(30).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export const adminQueryInputSchema = z.object({
  question: z
    .string({ required_error: 'Admin question is required' })
    .trim()
    .min(2, 'Question must be at least 2 characters')
    .max(500, 'Question cannot exceed 500 characters'),
});

// Lexical trade keywords for fallback parser
const TRADES = [
  'electrician',
  'plumber',
  'carpenter',
  'painter',
  'mason',
  'welder',
  'helper',
  'cleaner',
  'mechanic',
  'driver',
];

const CITIES = [
  'pune',
  'mumbai',
  'kolhapur',
  'nagpur',
  'nashik',
  'thane',
  'solapur',
  'aurangabad',
  'delhi',
  'bengaluru',
];

/**
 * Deterministic intent extractor for admin analytics questions
 */
export const extractIntentDeterministically = (questionText) => {
  const q = (questionText || '').toLowerCase();
  const filters = {};

  // Extract trade if present
  for (const t of TRADES) {
    if (q.includes(t)) {
      filters.skill = t;
      break;
    }
  }

  // Extract city if present
  for (const c of CITIES) {
    if (q.includes(c)) {
      filters.city = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Date range
  if (q.includes('30 days') || q.includes('month')) {
    filters.dateRange = '30d';
  } else if (q.includes('7 days') || q.includes('week')) {
    filters.dateRange = '7d';
  }

  // Action requests (Mutation safeguarding)
  if (
    q.includes('suspend') ||
    q.includes('ban') ||
    q.includes('delete') ||
    q.includes('approve') ||
    q.includes('reject') ||
    q.includes('cancel user') ||
    q.includes('modify') ||
    q.includes('update wage')
  ) {
    return { intent: 'action_request', filters };
  }

  // Analytics intents
  if (q.includes('delayed') || q.includes('behind schedule') || q.includes('overdue')) {
    return { intent: 'delayed_projects', filters };
  }
  if (q.includes('verification') || q.includes('backlog') || q.includes('awaiting verification')) {
    return { intent: 'verification_backlog', filters };
  }
  if (q.includes('shortage') || q.includes('supply gap') || q.includes('gap') || q.includes('demand and supply')) {
    return { intent: 'skill_demand_supply', filters };
  }
  if (
    q.includes('available worker') ||
    q.includes('how many worker') ||
    q.includes('how many verified') ||
    q.includes('workers available') ||
    q.includes('electricians are available') ||
    q.includes('plumbers are available')
  ) {
    return { intent: 'available_workers', filters };
  }
  if (q.includes('conversion') || q.includes('funnel') || q.includes('hiring rate')) {
    return { intent: 'hiring_conversion', filters };
  }
  if (q.includes('attendance') || q.includes('check in') || q.includes('check-in') || q.includes('absent')) {
    return { intent: 'attendance_summary', filters };
  }
  if (q.includes('payment') || q.includes('payout') || q.includes('disbursed') || q.includes('revenue')) {
    return { intent: 'payment_summary', filters };
  }
  if (q.includes('complaint')) {
    return { intent: 'open_complaints', filters };
  }
  if (q.includes('dispute')) {
    return { intent: 'open_disputes', filters };
  }
  if (q.includes('cancellation') || q.includes('cancelled')) {
    return { intent: 'cancellation_summary', filters };
  }
  if (
    q.includes('overview') ||
    q.includes('dashboard') ||
    q.includes('kpi') ||
    q.includes('platform summary') ||
    q.includes('stats')
  ) {
    return { intent: 'dashboard_overview', filters };
  }

  // Fallback to skill demand if asking about skills or wages
  if (q.includes('wage') || q.includes('highest average wage') || q.includes('skills')) {
    return { intent: 'skill_demand_supply', filters };
  }

  return { intent: 'unknown', filters };
};

/**
 * Extract intent using LLM if available, otherwise deterministic
 */
export const extractAdminIntent = async (question) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a query intent router for the KaamSetu Admin AI Analytics Assistant.
Classify the admin's analytics inquiry into one of the allowed intents and extract safe filters.

ALLOWED INTENTS:
- "dashboard_overview": Platform KPI metrics overview (total workers, employers, active jobs, projects).
- "delayed_projects": Inquiries about delayed, overdue, or behind-schedule projects.
- "skill_demand_supply": Inquiries about skill shortages, supply gaps, or average wages by trade.
- "available_workers": Inquiries about counts or details of available verified workers by skill or city.
- "hiring_conversion": Inquiries about hiring funnel, application-to-hire conversion rates.
- "verification_backlog": Inquiries about pending worker/employer verifications.
- "attendance_summary": Inquiries about worker attendance or site check-in rates.
- "payment_summary": Inquiries about total payments, platform disbursements, or payment records.
- "open_complaints": Inquiries about unresolved complaints or user reports.
- "open_disputes": Inquiries about unresolved payment/quality disputes.
- "cancellation_summary": Inquiries about cancellation rates of jobs or projects.
- "action_request": Requests to modify data, suspend users, cancel projects, or approve records.
- "unknown": Any question outside KaamSetu business analytics.

ALLOWED FILTER FIELDS:
- "city": string (e.g. "Pune", "Mumbai")
- "skill": string (e.g. "electrician", "plumber")
- "dateRange": string (e.g. "30d", "7d")

Output ONLY valid JSON matching:
{
  "intent": "<intent_enum>",
  "filters": { ... }
}

Question: "${question}"`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI intent parsing timeout')), 4000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
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
        const validated = adminAssistantIntentSchema.parse(parsed);
        return validated;
      }
    } catch (err) {
      console.warn('[AdminAssistant] Gemini intent parsing fallback:', err.message);
    }
  }

  // Deterministic fallback
  const fallback = extractIntentDeterministically(question);
  return adminAssistantIntentSchema.parse(fallback);
};

/**
 * Section 26.3: Approved read-only analytics execution tools
 */
export const executeApprovedAnalyticsTool = async (intent, filters) => {
  switch (intent) {
    case 'dashboard_overview': {
      const overview = await getDashboardOverview();
      return {
        metrics: overview.kpis,
        records: overview.activityFeed || [],
        sources: ['WorkerProfile', 'EmployerProfile', 'Job', 'Project', 'Payment', 'AuditLog'],
        definition: 'Overview metrics reflect live platform counts across workers, employers, jobs, and projects.',
      };
    }

    case 'delayed_projects': {
      const delayed = await getDelayedProjects();
      const records = delayed.map((p) => ({
        id: p._id,
        name: p.name || p.title,
        status: p.status,
        expectedEnd: p.currentExpectedEndDate || p.expectedEndDate,
        employerName: p.employerId?.name || 'N/A',
      }));
      return {
        metrics: {
          delayedCount: delayed.length,
        },
        records,
        sources: ['Project'],
        definition:
          'A project is counted as delayed when its current expected end date has passed and its status is neither completed nor closed.',
      };
    }

    case 'skill_demand_supply': {
      const analytics = await getSkillAnalytics(filters);
      let skills = analytics.skills || [];
      if (filters.skill) {
        skills = skills.filter((s) => s.skill.toLowerCase() === filters.skill.toLowerCase());
      }
      // Sort by supply gap descending
      skills.sort((a, b) => (b.gap || 0) - (a.gap || 0));

      const biggestShortage = skills.length > 0 ? skills[0] : null;

      return {
        metrics: {
          totalSkillsAnalyzed: skills.length,
          largestShortageSkill: biggestShortage?.skill || 'None',
          largestShortageGap: biggestShortage?.gap || 0,
        },
        records: skills.slice(0, 10),
        sources: ['Job', 'WorkerProfile', 'HiringAgreement'],
        definition:
          'Supply gap is calculated as open jobs (demand) minus currently available verified workers (supply) for each trade.',
      };
    }

    case 'available_workers': {
      const criteria = { availability: 'available' };
      if (filters.skill) {
        const regex = new RegExp(`^${filters.skill}$`, 'i');
        criteria.$or = [{ primarySkill: regex }, { skills: regex }];
      }
      if (filters.city) {
        criteria['location.city'] = new RegExp(`^${filters.city}$`, 'i');
      }

      const [count, verifiedCount, sample] = await Promise.all([
        WorkerProfile.countDocuments(criteria),
        WorkerProfile.countDocuments({ ...criteria, verificationStatus: 'verified' }),
        WorkerProfile.find(criteria)
          .populate('userId', 'name phone')
          .limit(10)
          .lean(),
      ]);

      const records = sample.map((w) => ({
        workerId: w.userId?._id || w.userId,
        name: w.fullName || w.userId?.name || 'Worker',
        primarySkill: w.primarySkill,
        city: w.location?.city || 'Unspecified',
        verified: w.verificationStatus === 'verified',
        rating: w.rating || 0,
        dailyWage: w.dailyWage,
      }));

      return {
        metrics: {
          availableWorkersCount: count,
          verifiedAvailableCount: verifiedCount,
          cityFilter: filters.city || 'All Cities',
          skillFilter: filters.skill || 'All Skills',
        },
        records,
        sources: ['WorkerProfile'],
        definition:
          'Available workers are registered workers with availability set to "available" in their profile.',
      };
    }

    case 'hiring_conversion': {
      const hiringData = await getHiringAnalytics(filters);
      return {
        metrics: hiringData.funnel || hiringData.rates || {},
        records: hiringData.stages || [],
        sources: ['JobApplication', 'HiringAgreement', 'Project'],
        definition:
          'Hiring conversion measures the progression from job creation to worker applications, confirmed agreements, and project completion.',
      };
    }

    case 'verification_backlog': {
      const [pendingCount, underReviewCount, oldestPending] = await Promise.all([
        VerificationRecord.countDocuments({ status: 'pending' }),
        VerificationRecord.countDocuments({ status: 'under_review' }),
        VerificationRecord.find({ status: 'pending' })
          .sort({ createdAt: 1 })
          .limit(5)
          .populate('userId', 'name role email')
          .lean(),
      ]);

      return {
        metrics: {
          totalBacklog: pendingCount + underReviewCount,
          pendingVerification: pendingCount,
          underReview: underReviewCount,
        },
        records: oldestPending.map((v) => ({
          recordId: v._id,
          userName: v.userId?.name || 'User',
          role: v.userId?.role || 'worker',
          type: v.verificationType,
          submittedAt: v.createdAt,
        })),
        sources: ['VerificationRecord'],
        definition:
          'Verification backlog includes all identity and skill verification submissions with status "pending" or "under_review".',
      };
    }

    case 'attendance_summary': {
      const attData = await getAttendanceAnalytics(filters);
      return {
        metrics: attData.kpis || {},
        records: attData.dailyTrends || [],
        sources: ['Attendance'],
        definition: 'Attendance analytics reflect geo-verified check-in and check-out logs across active projects.',
      };
    }

    case 'payment_summary': {
      const payData = await getPaymentAnalytics(filters);
      const completedTotal = await Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalAmount = completedTotal[0]?.total || 0;

      return {
        metrics: {
          totalCompletedPayments: totalAmount,
          ...payData.kpis,
        },
        records: payData.totalsByProject || [],
        sources: ['Payment'],
        definition:
          'Recorded payment total calculates all transactions successfully disbursed or recorded with status "completed" or "recorded".',
      };
    }

    case 'open_complaints': {
      const complaints = await Complaint.find({ status: { $in: ['new', 'under_review', 'investigating'] } })
        .populate('reporterId', 'name')
        .populate('targetUserId', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      return {
        metrics: {
          openComplaintsCount: complaints.length,
        },
        records: complaints.map((c) => ({
          id: c._id,
          category: c.category,
          priority: c.priority,
          reporter: c.reporterId?.name || 'N/A',
          target: c.targetUserId?.name || 'N/A',
          status: c.status,
          createdAt: c.createdAt,
        })),
        sources: ['Complaint'],
        definition:
          'Open complaints are reports awaiting investigation or active review (statuses: new, under_review, investigating).',
      };
    }

    case 'open_disputes': {
      const disputes = await Dispute.find({ status: { $in: ['open', 'under_review', 'investigating'] } })
        .populate('initiatedBy', 'name')
        .populate('againstUserId', 'name')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const totalDisputedAmount = disputes.reduce((sum, d) => sum + (d.amount || 0), 0);

      return {
        metrics: {
          openDisputesCount: disputes.length,
          totalDisputedAmount,
        },
        records: disputes.map((d) => ({
          id: d._id,
          type: d.type,
          amount: d.amount,
          initiator: d.initiatedBy?.name || 'N/A',
          respondent: d.againstUserId?.name || 'N/A',
          projectName: d.projectId?.name || 'N/A',
          status: d.status,
        })),
        sources: ['Dispute'],
        definition:
          'Open disputes represent formal project grievances awaiting mediation with unresolved financial or contract terms.',
      };
    }

    case 'cancellation_summary': {
      const [cancelledJobs, totalJobs, cancelledProjects, totalProjects] = await Promise.all([
        Job.countDocuments({ status: 'cancelled' }),
        Job.countDocuments(),
        Project.countDocuments({ status: 'cancelled' }),
        Project.countDocuments(),
      ]);

      const jobCancelRate = totalJobs > 0 ? ((cancelledJobs / totalJobs) * 100).toFixed(1) : 0;
      const projectCancelRate = totalProjects > 0 ? ((cancelledProjects / totalProjects) * 100).toFixed(1) : 0;

      return {
        metrics: {
          cancelledJobs,
          totalJobs,
          jobCancelRate: `${jobCancelRate}%`,
          cancelledProjects,
          totalProjects,
          projectCancelRate: `${projectCancelRate}%`,
        },
        records: [],
        sources: ['Job', 'Project'],
        definition:
          'Cancellation rates measure jobs and projects cancelled before fulfillment against total creations.',
      };
    }

    default:
      return {
        metrics: {},
        records: [],
        sources: [],
        definition: '',
      };
  }
};

/**
 * Generate human-friendly, factual answer based strictly on analytics results
 */
export const synthesizeAnswer = (question, intent, toolResult) => {
  if (intent === 'action_request') {
    return 'The AI Analytics Assistant is read-only and does not perform data mutations, user suspensions, or approvals. To perform actions, please navigate to the corresponding admin management section (e.g. Users, Verifications, or Projects).';
  }

  if (intent === 'unknown') {
    return 'I cannot reliably answer this question from the available platform analytics. You can ask about delayed projects, skill shortages, available workers by city, verification backlogs, hiring conversion, payments, attendance, complaints, or disputes.';
  }

  const { metrics = {}, definition = '' } = toolResult;

  switch (intent) {
    case 'dashboard_overview':
      return `Platform Overview: Currently tracking ${metrics.totalWorkers || 0} registered workers (${metrics.verifiedWorkers || 0} verified), ${metrics.totalEmployers || 0} employers, ${metrics.activeJobs || 0} open jobs, and ${metrics.activeProjects || 0} active projects. ${definition}`;

    case 'delayed_projects':
      return `The project data contains ${metrics.delayedCount || 0} delayed project(s) as of the current query time. ${definition}`;

    case 'skill_demand_supply':
      if (metrics.largestShortageSkill && metrics.largestShortageSkill !== 'None') {
        return `Based on live job postings and available worker profiles, "${metrics.largestShortageSkill}" has the largest supply gap on the platform with an estimated net shortage of ${metrics.largestShortageGap} worker(s). ${definition}`;
      }
      return `There are currently no significant supply deficits detected across the analyzed trades. ${definition}`;

    case 'available_workers':
      return `Currently, there are ${metrics.availableWorkersCount || 0} available worker(s) (${metrics.verifiedAvailableCount || 0} verified) recorded in the database matching "${metrics.skillFilter}" in "${metrics.cityFilter}". ${definition}`;

    case 'hiring_conversion':
      return `Hiring conversion analytics indicate that applications are converting through the agreement and project creation stages. ${definition}`;

    case 'verification_backlog':
      return `There are currently ${metrics.totalBacklog || 0} verification application(s) awaiting administrative review (${metrics.pendingVerification || 0} pending, ${metrics.underReview || 0} under review). ${definition}`;

    case 'attendance_summary':
      return `Attendance records have been retrieved. ${definition}`;

    case 'payment_summary':
      return `The current recorded payment total completed on the platform is ₹${(metrics.totalCompletedPayments || 0).toLocaleString()}. ${definition}`;

    case 'open_complaints':
      return `There are currently ${metrics.openComplaintsCount || 0} open complaint(s) awaiting administrative review. ${definition}`;

    case 'open_disputes':
      return `There are currently ${metrics.openDisputesCount || 0} open formal dispute(s) on the platform, representing a total disputed sum of ₹${(metrics.totalDisputedAmount || 0).toLocaleString()}. ${definition}`;

    case 'cancellation_summary':
      return `The recorded job cancellation rate is ${metrics.jobCancelRate || '0%'} (${metrics.cancelledJobs || 0} of ${metrics.totalJobs || 0} jobs), and project cancellation rate is ${metrics.projectCancelRate || '0%'} (${metrics.cancelledProjects || 0} of ${metrics.totalProjects || 0} projects). ${definition}`;

    default:
      return 'The requested analytics data has been fetched from platform records.';
  }
};

/**
 * Main query pipeline (Section 26.2)
 */
export const processAdminQuery = async (rawInput, adminUser) => {
  // 1. Input validation with Zod
  const validated = adminQueryInputSchema.parse(rawInput);
  const question = validated.question;

  // 2. Intent extraction & strict Zod intent validation
  const intentData = await extractAdminIntent(question);
  const validatedIntent = adminAssistantIntentSchema.parse(intentData);

  const { intent, filters } = validatedIntent;

  // 3. Execute approved analytics tool (Read-only, zero arbitrary database code)
  const toolResult = await executeApprovedAnalyticsTool(intent, filters);

  // 4. Synthesize data-backed answer
  const answer = synthesizeAnswer(question, intent, toolResult);

  const generatedAt = new Date().toISOString();

  // 5. Persist assistant history
  if (adminUser?._id) {
    try {
      await AdminAssistantConversation.create({
        adminId: adminUser._id,
        question,
        intent,
        response: answer,
        sources: toolResult.sources || [],
        metrics: toolResult.metrics || {},
        records: toolResult.records || [],
      });
    } catch (saveErr) {
      console.warn('Failed to persist assistant conversation:', saveErr.message);
    }
  }

  return {
    answer,
    intent,
    metrics: toolResult.metrics || {},
    records: toolResult.records || [],
    sources: toolResult.sources || [],
    generatedAt,
  };
};

/**
 * Fetch conversation history for authorized admin
 */
export const getAdminConversationHistory = async (adminId, limit = 20) => {
  const history = await AdminAssistantConversation.find({ adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return history.reverse();
};

export default {
  adminAssistantIntentSchema,
  adminQueryInputSchema,
  extractIntentDeterministically,
  extractAdminIntent,
  executeApprovedAnalyticsTool,
  synthesizeAnswer,
  processAdminQuery,
  getAdminConversationHistory,
};
