import Job from '../models/Job.js';
import EmployerProfile from '../models/EmployerProfile.js';
import User from '../models/User.js';

export const createJobForEmployer = async (employerId, jobData) => {
  const job = new Job({
    ...jobData,
    employerId,
  });
  return await job.save();
};

export const getEmployerJobs = async (employerId, queryParams = {}) => {
  const { status } = queryParams;
  const filter = { employerId };
  if (status) {
    filter.status = status;
  }
  return await Job.find(filter).sort({ createdAt: -1 });
};

export const getEmployerJobById = async (employerId, jobId) => {
  return await Job.findOne({ _id: jobId, employerId });
};

export const updateEmployerJob = async (employerId, jobId, updateData) => {
  return await Job.findOneAndUpdate(
    { _id: jobId, employerId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

export const closeEmployerJob = async (employerId, jobId) => {
  return await Job.findOneAndUpdate(
    { _id: jobId, employerId },
    { $set: { status: 'closed' } },
    { new: true }
  );
};

export const getAvailableJobs = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    skill,
    city,
    area,
    minWage,
    maxWage,
    durationType,
    startDate,
    search,
    sort = 'newest',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Base filter: only open jobs
  const filter = { status: 'open' };

  if (skill && skill.trim()) {
    filter.skillRequired = { $regex: new RegExp(skill.trim(), 'i') };
  }

  if (city && city.trim()) {
    filter['location.city'] = { $regex: new RegExp(city.trim(), 'i') };
  }

  if (area && area.trim()) {
    filter['location.area'] = { $regex: new RegExp(area.trim(), 'i') };
  }

  if (minWage || maxWage) {
    filter.wageAmount = {};
    if (minWage) filter.wageAmount.$gte = parseFloat(minWage);
    if (maxWage) filter.wageAmount.$lte = parseFloat(maxWage);
  }

  if (durationType) {
    filter.durationType = durationType;
  }

  if (startDate) {
    filter.startDate = { $gte: new Date(startDate) };
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { skillRequired: searchRegex },
      { 'location.city': searchRegex },
      { 'location.area': searchRegex },
    ];
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  } else if (sort === 'wage_high') {
    sortOption = { wageAmount: -1 };
  } else if (sort === 'wage_low') {
    sortOption = { wageAmount: 1 };
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate('employerId', 'name email phone'),
    Job.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  // Enrich with employer business profile info if available
  const enrichedJobs = await Promise.all(
    jobs.map(async (jobDoc) => {
      const job = jobDoc.toJSON();
      if (job.employerId && job.employerId._id) {
        const empProfile = await EmployerProfile.findOne({ userId: job.employerId._id }).select(
          'name businessName businessType location rating'
        );
        job.employerProfile = empProfile || null;
      }
      return job;
    })
  );

  return {
    jobs: enrichedJobs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

export const getJobByIdForWorker = async (jobId) => {
  const job = await Job.findById(jobId).populate('employerId', 'name email phone');
  if (!job) return null;

  const jobObj = job.toJSON ? job.toJSON() : { ...job };
  const employerUserId = jobObj.employerId?._id || jobObj.employerId?.id || jobObj.employerId;
  if (employerUserId) {
    const empProfile = await EmployerProfile.findOne({ userId: employerUserId }).select(
      'name companyName businessName businessType location description rating totalReviews'
    );
    jobObj.employerProfile = empProfile ? (empProfile.toJSON ? empProfile.toJSON() : empProfile) : null;
  }

  return jobObj;
};
