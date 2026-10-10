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
  Review,
  Complaint,
  Dispute,
} from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';
import { getSkillAnalytics } from '../analytics/skillAnalytics.js';
import { getLocationAnalytics } from '../analytics/locationAnalytics.js';

// Escape text to prevent CSV formula injection (OWASP guideline)
export const sanitizeForCSV = (value) => {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // If starts with sensitive formula characters: =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes
  return str.replace(/"/g, '""');
};

export const convertToCSV = ({ headers, data }) => {
  if (!data || data.length === 0) return headers.join(',') + '\n';
  const csvRows = [];
  csvRows.push(headers.map((h) => `"${sanitizeForCSV(h)}"`).join(','));

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header] !== undefined && row[header] !== null ? row[header] : '';
      return `"${sanitizeForCSV(val)}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

export const generateReportData = async (reportType, query = {}) => {
  const {
    status,
    city,
    category,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    format,
  } = query;

  const isCSV = format === 'csv';
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = isCSV ? 5000 : Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const { startDate, endDate } = parseDateRange(query);
  const dateFilter = {};
  if (startDate) {
    dateFilter.createdAt = { $gte: startDate, $lte: endDate };
  }

  let headers = [];
  let data = [];
  let totalCount = 0;

  switch (reportType) {
    case 'workers': {
      headers = ['Worker ID', 'Name', 'Phone', 'Primary Skill', 'Experience (Yrs)', 'Daily Wage', 'Status', 'Verified', 'City', 'Created Date'];
      const match = {};
      if (status) match.verificationStatus = status;
      if (city) match['location.city'] = new RegExp(city, 'i');
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      let queryBuilder = WorkerProfile.find(match).populate('userId', 'name phone email status');

      if (search) {
        queryBuilder = WorkerProfile.find({
          ...match,
          $or: [
            { fullName: new RegExp(search, 'i') },
            { primarySkill: new RegExp(search, 'i') },
            { 'location.city': new RegExp(search, 'i') },
          ],
        }).populate('userId', 'name phone email status');
      }

      totalCount = await WorkerProfile.countDocuments(queryBuilder.getFilter());
      const raw = await queryBuilder
        .sort({ [sortBy === 'createdAt' ? 'createdAt' : sortBy]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((w) => ({
        'Worker ID': String(w._id),
        Name: w.fullName || w.userId?.name || 'N/A',
        Phone: w.userId?.phone || 'N/A',
        'Primary Skill': w.primarySkill || 'N/A',
        'Experience (Yrs)': w.experienceYears || 0,
        'Daily Wage': w.dailyWage ? `₹${w.dailyWage}` : 'N/A',
        Status: w.userId?.status || 'active',
        Verified: w.verificationStatus === 'verified' ? 'Yes' : 'No',
        City: w.location?.city || 'Unspecified',
        'Created Date': w.createdAt ? new Date(w.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'employers': {
      headers = ['Employer ID', 'Name', 'Business Name', 'Business Type', 'City', 'Verified', 'Created Date'];
      const match = {};
      if (city) match['location.city'] = new RegExp(city, 'i');
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };
      if (search) {
        match.$or = [
          { name: new RegExp(search, 'i') },
          { businessName: new RegExp(search, 'i') },
          { 'location.city': new RegExp(search, 'i') },
        ];
      }

      totalCount = await EmployerProfile.countDocuments(match);
      const raw = await EmployerProfile.find(match)
        .populate('userId', 'name phone email status')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((e) => ({
        'Employer ID': String(e._id),
        Name: e.name || e.userId?.name || 'N/A',
        'Business Name': e.businessName || 'N/A',
        'Business Type': e.businessType || 'other',
        City: e.location?.city || 'Unspecified',
        Verified: e.verificationStatus === 'verified' ? 'Yes' : 'No',
        'Created Date': e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'jobs': {
      headers = ['Job ID', 'Title', 'Skill Required', 'Workers Needed', 'Wage Type', 'Wage Amount', 'Status', 'City', 'Created Date'];
      const match = {};
      if (status) match.status = status;
      if (city) match['location.city'] = new RegExp(city, 'i');
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };
      if (search) {
        match.$or = [
          { title: new RegExp(search, 'i') },
          { skillRequired: new RegExp(search, 'i') },
          { 'location.city': new RegExp(search, 'i') },
        ];
      }

      totalCount = await Job.countDocuments(match);
      const raw = await Job.find(match)
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((j) => ({
        'Job ID': String(j._id),
        Title: j.title,
        'Skill Required': j.skillRequired,
        'Workers Needed': j.workersRequired,
        'Wage Type': j.wageType,
        'Wage Amount': `₹${j.wageAmount}`,
        Status: j.status,
        City: j.location?.city || 'Unspecified',
        'Created Date': j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'applications': {
      headers = ['Application ID', 'Job ID', 'Worker', 'Employer', 'Proposed Wage', 'Status', 'Created Date'];
      const match = {};
      if (status) match.status = status;
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      totalCount = await JobApplication.countDocuments(match);
      const raw = await JobApplication.find(match)
        .populate('workerId', 'name phone')
        .populate('employerId', 'name')
        .populate('jobId', 'title')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((a) => ({
        'Application ID': String(a._id),
        'Job ID': a.jobId?.title || String(a.jobId || 'N/A'),
        Worker: a.workerId?.name || 'N/A',
        Employer: a.employerId?.name || 'N/A',
        'Proposed Wage': `₹${a.proposedWage}`,
        Status: a.status,
        'Created Date': a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'agreements':
    case 'hiring_agreements': {
      headers = ['Agreement ID', 'Job ID', 'Worker', 'Employer', 'Agreed Wage', 'Wage Type', 'Status', 'Start Date', 'Created Date'];
      const match = {};
      if (status) match.status = status;
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      totalCount = await HiringAgreement.countDocuments(match);
      const raw = await HiringAgreement.find(match)
        .populate('workerId', 'name phone')
        .populate('employerId', 'name')
        .populate('jobId', 'title')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((h) => ({
        'Agreement ID': String(h._id),
        'Job ID': h.jobId?.title || String(h.jobId || 'N/A'),
        Worker: h.workerId?.name || 'N/A',
        Employer: h.employerId?.name || 'N/A',
        'Agreed Wage': h.agreedWage ? `₹${h.agreedWage}` : `₹${h.proposedWage} (Proposed)`,
        'Wage Type': h.wageType,
        Status: h.status,
        'Start Date': h.startDate ? new Date(h.startDate).toISOString().split('T')[0] : 'N/A',
        'Created Date': h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'projects': {
      headers = ['Project ID', 'Title', 'Employer', 'Status', 'Daily Wage', 'Progress', 'Start Date', 'Expected End', 'City'];
      const match = {};
      if (status) match.status = status;
      if (city) match['location.city'] = new RegExp(city, 'i');
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };
      if (search) {
        match.$or = [
          { name: new RegExp(search, 'i') },
          { 'location.city': new RegExp(search, 'i') },
        ];
      }

      totalCount = await Project.countDocuments(match);
      const raw = await Project.find(match)
        .populate('employerId', 'name')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((p) => ({
        'Project ID': String(p._id),
        Title: p.name,
        Employer: p.employerId?.name || 'N/A',
        Status: p.status,
        'Daily Wage': `₹${p.paymentAmount}`,
        Progress: `${p.progressPercentage || 0}%`,
        'Start Date': p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : 'N/A',
        'Expected End': p.currentExpectedEndDate ? new Date(p.currentExpectedEndDate).toISOString().split('T')[0] : 'N/A',
        City: p.location?.city || 'Unspecified',
      }));
      break;
    }

    case 'attendance': {
      headers = ['Attendance ID', 'Date', 'Project', 'Worker', 'Status', 'Check In', 'Check Out'];
      const match = {};
      if (status) match.status = status;
      if (startDate) {
        match.date = {
          $gte: startDate.toISOString().split('T')[0],
          $lte: endDate.toISOString().split('T')[0],
        };
      }

      totalCount = await Attendance.countDocuments(match);
      const raw = await Attendance.find(match)
        .populate('workerId', 'name')
        .populate('projectId', 'name')
        .sort({ date: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((att) => ({
        'Attendance ID': String(att._id),
        Date: att.date,
        Project: att.projectId?.name || 'N/A',
        Worker: att.workerId?.name || 'N/A',
        Status: att.status,
        'Check In': att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : 'N/A',
        'Check Out': att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : 'N/A',
      }));
      break;
    }

    case 'payments': {
      headers = ['Payment ID', 'Project', 'Worker', 'Employer', 'Amount', 'Type', 'Method', 'Status', 'Payment Date'];
      const match = {};
      if (status) match.status = status;
      if (startDate) match.paymentDate = { $gte: startDate, $lte: endDate };

      totalCount = await Payment.countDocuments(match);
      const raw = await Payment.find(match)
        .populate('workerId', 'name')
        .populate('employerId', 'name')
        .populate('projectId', 'name')
        .sort({ paymentDate: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((pm) => ({
        'Payment ID': String(pm._id),
        Project: pm.projectId?.name || 'N/A',
        Worker: pm.workerId?.name || 'N/A',
        Employer: pm.employerId?.name || 'N/A',
        Amount: `₹${pm.amount}`,
        Type: pm.type,
        Method: pm.method,
        Status: pm.status,
        'Payment Date': pm.paymentDate ? new Date(pm.paymentDate).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'reviews': {
      headers = ['Review ID', 'Project', 'Reviewer', 'Reviewee', 'Role', 'Rating', 'Created Date'];
      const match = {};
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      totalCount = await Review.countDocuments(match);
      const raw = await Review.find(match)
        .populate('reviewerId', 'name')
        .populate('revieweeId', 'name')
        .populate('projectId', 'name')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((r) => ({
        'Review ID': String(r._id),
        Project: r.projectId?.name || 'N/A',
        Reviewer: r.reviewerId?.name || 'N/A',
        Reviewee: r.revieweeId?.name || 'N/A',
        Role: `${r.reviewerRole} -> ${r.revieweeRole}`,
        Rating: `${r.rating} / 5`,
        'Created Date': r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'complaints': {
      headers = ['Complaint ID', 'Reporter', 'Target User', 'Category', 'Priority', 'Status', 'Created Date'];
      const match = {};
      if (status) match.status = status;
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      totalCount = await Complaint.countDocuments(match);
      const raw = await Complaint.find(match)
        .populate('reporterId', 'name')
        .populate('targetUserId', 'name')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((c) => ({
        'Complaint ID': String(c._id),
        Reporter: c.reporterId?.name || 'N/A',
        'Target User': c.targetUserId?.name || 'N/A',
        Category: c.category,
        Priority: c.priority,
        Status: c.status,
        'Created Date': c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'disputes': {
      headers = ['Dispute ID', 'Project', 'Initiator', 'Against User', 'Type', 'Disputed Amount', 'Status', 'Created Date'];
      const match = {};
      if (status) match.status = status;
      if (startDate) match.createdAt = { $gte: startDate, $lte: endDate };

      totalCount = await Dispute.countDocuments(match);
      const raw = await Dispute.find(match)
        .populate('initiatedBy', 'name')
        .populate('againstUserId', 'name')
        .populate('projectId', 'name')
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      data = raw.map((d) => ({
        'Dispute ID': String(d._id),
        Project: d.projectId?.name || 'N/A',
        Initiator: d.initiatedBy?.name || 'N/A',
        'Against User': d.againstUserId?.name || 'N/A',
        Type: d.type,
        'Disputed Amount': `₹${d.amount || 0}`,
        Status: d.status,
        'Created Date': d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : 'N/A',
      }));
      break;
    }

    case 'skills':
    case 'skill_demand': {
      headers = ['Skill', 'Open Jobs (Demand)', 'Available Workers (Supply)', 'Relevant Workers', 'Hires', 'Completed Projects', 'Advertised Wage', 'Agreed Wage', 'Supply Gap'];
      const res = await getSkillAnalytics(query);
      const list = res.skills || [];
      totalCount = list.length;
      data = list.map((s) => ({
        Skill: s.skill,
        'Open Jobs (Demand)': s.openJobs,
        'Available Workers (Supply)': s.availableWorkers,
        'Relevant Workers': s.relevantWorkers,
        Hires: s.hires,
        'Completed Projects': s.completedProjects,
        'Advertised Wage': s.avgAdvertisedWage,
        'Agreed Wage': s.avgAgreedWage,
        'Supply Gap': s.gap,
      }));
      break;
    }

    case 'locations':
    case 'geo_demand_supply': {
      headers = ['City', 'Open Jobs (Demand)', 'Available Workers (Supply)', 'Total Workers', 'Active Projects', 'Avg Wage', 'Gap'];
      const res = await getLocationAnalytics(query);
      const list = res.locations || [];
      totalCount = list.length;
      data = list.map((l) => ({
        City: l.city,
        'Open Jobs (Demand)': l.demand,
        'Available Workers (Supply)': l.supply,
        'Total Workers': l.totalWorkers,
        'Active Projects': l.activeProjects,
        'Avg Wage': `₹${l.avgWage}`,
        Gap: l.gap,
      }));
      break;
    }

    default: {
      headers = ['Job ID', 'Title', 'Category', 'Wage Amount', 'Status'];
      totalCount = await Job.countDocuments();
      const raw = await Job.find().sort({ createdAt: sortDirection }).skip(skip).limit(parsedLimit).lean();
      data = raw.map((j) => ({
        'Job ID': String(j._id),
        Title: j.title,
        Category: j.skillRequired,
        'Wage Amount': `₹${j.wageAmount}`,
        Status: j.status,
      }));
    }
  }

  return {
    reportType,
    page: parsedPage,
    limit: parsedLimit,
    totalRecords: totalCount,
    totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    headers,
    data,
  };
};

export default {
  generateReportData,
  convertToCSV,
  sanitizeForCSV,
};
