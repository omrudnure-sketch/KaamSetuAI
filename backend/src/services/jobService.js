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

export const getEmployerJobById = async (employerId, jobId, isAdmin = false) => {
  const filter = { _id: jobId };
  if (!isAdmin) {
    filter.employerId = employerId;
  }
  const job = await Job.findOne(filter);
  if (!job) return null;

  const jobObj = job.toJSON ? job.toJSON() : { ...job };

  if (!jobObj.skillRequired && jobObj.category) {
    jobObj.skillRequired = jobObj.category;
  }
  const days = Number(jobObj.durationDays || jobObj.duration_days);
  if (!jobObj.durationType || (jobObj.durationType === 'single_day' && days > 1)) {
    jobObj.durationType = days ? (days === 1 ? 'single_day' : 'fixed_duration') : 'single_day';
  }
  const needed = Number(jobObj.workersNeeded || jobObj.workers_needed);
  if (needed) {
    jobObj.workersRequired = needed;
  } else if (!jobObj.workersRequired) {
    jobObj.workersRequired = 1;
  }
  return jobObj;
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

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const isValidCoord = (lng, lat) => {
  const numLng = Number(lng);
  const numLat = Number(lat);
  return (
    !isNaN(numLng) &&
    !isNaN(numLat) &&
    numLng >= -180 &&
    numLng <= 180 &&
    numLat >= -90 &&
    numLat <= 90 &&
    !(numLng === 0 && numLat === 0)
  );
};

export const getAvailableJobs = async (queryParams) => {
  const {
    skill,
    city,
    area,
    minWage,
    maxWage,
    durationType,
    startDate,
    search,
    sort = 'newest',
    page = 1,
    limit = 10,
    lat,
    lng,
    latitude,
    longitude,
    radius,
    distance,
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

  const rawLat = lat !== undefined ? lat : latitude;
  const rawLng = lng !== undefined ? lng : longitude;
  const hasUserCoords = isValidCoord(rawLng, rawLat);
  const userLat = Number(rawLat);
  const userLng = Number(rawLng);
  const maxRadius = Number(radius || distance) || null;

  // If sorting by nearest or filtering by radius, fetch larger batch for distance calculation
  const fetchLimit = hasUserCoords ? 200 : limitNum;
  const fetchSkip = hasUserCoords ? 0 : skip;

  const [jobs, totalCount] = await Promise.all([
    Job.find(filter)
      .sort(sortOption)
      .skip(fetchSkip)
      .limit(fetchLimit)
      .populate('employerId', 'name'),
    Job.countDocuments(filter),
  ]);

  // Enrich with employer business profile info if available & calculate distances
  let enrichedJobs = await Promise.all(
    jobs.map(async (jobDoc) => {
      const job = jobDoc.toJSON ? jobDoc.toJSON() : { ...jobDoc };
      
      // Never expose employer phone/email publicly on jobs listing
      if (job.employerId && typeof job.employerId === 'object') {
        delete job.employerId.phone;
        delete job.employerId.email;
      }

      if (job.employerId && (job.employerId._id || job.employerId.id)) {
        const empUserId = job.employerId._id || job.employerId.id;
        const empProfile = await EmployerProfile.findOne({ userId: empUserId }).select(
          'name companyName businessName businessType location rating'
        );
        job.employerProfile = empProfile ? (empProfile.toJSON ? empProfile.toJSON() : empProfile) : null;
      }

      const jLng = job.longitude ?? (job.location?.coordinates?.coordinates?.[0] ?? null);
      const jLat = job.latitude ?? (job.location?.coordinates?.coordinates?.[1] ?? null);
      if (hasUserCoords && isValidCoord(jLng, jLat)) {
        job.distanceKm = haversineDistanceKm(userLat, userLng, Number(jLat), Number(jLng));
      } else {
        job.distanceKm = null;
      }

      return job;
    })
  );

  if (hasUserCoords) {
    if (maxRadius) {
      enrichedJobs = enrichedJobs.filter((j) => j.distanceKm === null || j.distanceKm <= maxRadius);
    }
    if (sort === 'nearest') {
      enrichedJobs.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }
    const finalTotal = enrichedJobs.length;
    const paginated = enrichedJobs.slice(skip, skip + limitNum);
    return {
      jobs: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limitNum) || 1,
      },
    };
  }

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    jobs: enrichedJobs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages,
    },
  };
};

export const getJobByIdForWorker = async (jobId) => {
  const job = await Job.findById(jobId).populate('employerId', 'name');
  if (!job) return null;

  const jobObj = job.toJSON ? job.toJSON() : { ...job };
  if (jobObj.employerId && typeof jobObj.employerId === 'object') {
    delete jobObj.employerId.phone;
    delete jobObj.employerId.email;
  }

  const employerUserId = jobObj.employerId?._id || jobObj.employerId?.id || jobObj.employerId;
  if (employerUserId) {
    const empProfile = await EmployerProfile.findOne({ userId: employerUserId }).select(
      'name companyName businessName businessType location description rating totalReviews'
    );
    jobObj.employerProfile = empProfile ? (empProfile.toJSON ? empProfile.toJSON() : empProfile) : null;
  }

  return jobObj;
};

