import { Job, WorkerProfile, EmployerProfile, Project } from '../models/index.js';

// Helper: validate coordinates
export const isValidCoordinate = (lng, lat) => {
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

// Helper: approximate coordinates for worker privacy (~1km precision)
export const approximateCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!isValidCoordinate(lng, lat)) return null;
  // Round to 2 decimal places to prevent exposing exact residential doorstep
  return [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100];
};

/**
 * GET /api/jobs/map
 * Discover open jobs on map with geospatial & attribute filtering
 */
export const getJobsMap = async (req, res, next) => {
  try {
    const {
      city,
      skill,
      minWage,
      maxWage,
      durationType,
      startDate,
      lat,
      lng,
      distance = 25, // km
    } = req.query;

    const query = { status: 'open' };

    if (city) {
      query['location.city'] = new RegExp(city.trim(), 'i');
    }

    if (skill) {
      query.skillRequired = new RegExp(skill.trim(), 'i');
    }

    if (durationType) {
      query.durationType = durationType;
    }

    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }

    if (minWage || maxWage) {
      query.wageAmount = {};
      if (minWage) query.wageAmount.$gte = Number(minWage);
      if (maxWage) query.wageAmount.$lte = Number(maxWage);
    }

    // Geospatial query when valid coordinates provided
    if (isValidCoordinate(lng, lat)) {
      const radiusInRadians = Number(distance) / 6378.1;
      query['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
        },
      };
    }

    const jobs = await Job.find(query)
      .populate('employerId', 'name')
      .select('title skillRequired workersRequired wageType wageAmount durationType startDate workingHours location createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedJobs = jobs.map((j) => {
      const coords = j.location?.coordinates?.coordinates || [0, 0];
      const hasCoords = isValidCoordinate(coords[0], coords[1]);

      return {
        _id: j._id,
        title: j.title,
        skillRequired: j.skillRequired,
        workersRequired: j.workersRequired,
        wageType: j.wageType,
        wageAmount: j.wageAmount,
        durationType: j.durationType,
        startDate: j.startDate,
        workingHours: j.workingHours,
        location: {
          city: j.location?.city || 'Unspecified',
          area: j.location?.area || '',
          coordinates: coords, // [lng, lat]
          hasCoordinates: hasCoords,
        },
        employer: {
          name: j.employerId?.name || 'Employer',
        },
      };
    });

    res.json({
      success: true,
      count: formattedJobs.length,
      data: formattedJobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workers/map
 * Discover eligible workers for employers with privacy protection
 */
export const getWorkersMap = async (req, res, next) => {
  try {
    const {
      skill,
      city,
      availability,
      minExperience,
      minWage,
      maxWage,
      rating,
      verificationStatus,
      lat,
      lng,
      distance = 25,
    } = req.query;

    const query = {};

    if (city) {
      query['location.city'] = new RegExp(city.trim(), 'i');
    }

    if (availability) {
      query.availability = availability;
    }

    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    if (minExperience) {
      query.experienceYears = { $gte: Number(minExperience) };
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (minWage || maxWage) {
      query.dailyWage = {};
      if (minWage) query.dailyWage.$gte = Number(minWage);
      if (maxWage) query.dailyWage.$lte = Number(maxWage);
    }

    if (skill) {
      const skillRegex = new RegExp(skill.trim(), 'i');
      query.$or = [{ primarySkill: skillRegex }, { skills: skillRegex }];
    }

    if (isValidCoordinate(lng, lat)) {
      const radiusInRadians = Number(distance) / 6378.1;
      query['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
        },
      };
    }

    // Populate user status to ensure only active users appear
    const workers = await WorkerProfile.find(query)
      .populate('userId', 'status')
      .select('fullName primarySkill skills experienceYears dailyWage availability verificationStatus rating totalReviews location')
      .limit(100)
      .lean();

    // Filter out inactive or suspended accounts
    const activeWorkers = workers.filter((w) => !w.userId || w.userId.status === 'active');

    const formattedWorkers = activeWorkers.map((w) => {
      const rawCoords = w.location?.coordinates?.coordinates || [0, 0];
      const approxCoords = approximateCoordinates(rawCoords);

      return {
        _id: w._id,
        fullName: w.fullName,
        primarySkill: w.primarySkill,
        skills: w.skills || [],
        experienceYears: w.experienceYears || 0,
        dailyWage: w.dailyWage || 0,
        availability: w.availability,
        verificationStatus: w.verificationStatus,
        rating: w.rating || 0,
        totalReviews: w.totalReviews || 0,
        location: {
          city: w.location?.city || 'Unspecified',
          area: w.location?.area || '',
          coordinates: approxCoords || [0, 0], // Approximate for privacy!
          hasCoordinates: approxCoords !== null,
        },
      };
    });

    res.json({
      success: true,
      count: formattedWorkers.length,
      data: formattedWorkers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/geo-supply
 * Admin aggregate worker supply by city and skill
 */
export const getAdminGeoSupply = async (req, res, next) => {
  try {
    const supplyByCity = await WorkerProfile.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$location.city', 'Unspecified'] },
          totalWorkers: { $sum: 1 },
          availableWorkers: {
            $sum: { $cond: [{ $eq: ['$availability', 'available'] }, 1, 0] },
          },
          verifiedWorkers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] },
          },
          avgWage: { $avg: '$dailyWage' },
        },
      },
      { $sort: { totalWorkers: -1 } },
    ]);

    res.json({
      success: true,
      data: supplyByCity.map((c) => ({
        city: c._id,
        totalWorkers: c.totalWorkers,
        availableWorkers: c.availableWorkers,
        verifiedWorkers: c.verifiedWorkers,
        avgWage: Math.round(c.avgWage || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/geo-demand
 * Admin aggregate open job demand by city
 */
export const getAdminGeoDemand = async (req, res, next) => {
  try {
    const demandByCity = await Job.aggregate([
      { $match: { status: 'open' } },
      {
        $group: {
          _id: { $ifNull: ['$location.city', 'Unspecified'] },
          openJobs: { $sum: 1 },
          workersNeeded: { $sum: '$workersRequired' },
          avgWage: { $avg: '$wageAmount' },
        },
      },
      { $sort: { openJobs: -1 } },
    ]);

    res.json({
      success: true,
      data: demandByCity.map((c) => ({
        city: c._id,
        openJobs: c.openJobs,
        workersNeeded: c.workersNeeded,
        avgWage: Math.round(c.avgWage || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/geo-gaps
 * Admin aggregate demand/supply gaps by location and skill
 */
export const getAdminGeoGaps = async (req, res, next) => {
  try {
    const [jobsAgg, workersAgg, projectsAgg] = await Promise.all([
      // Open jobs grouped by city and skill
      Job.aggregate([
        { $match: { status: 'open' } },
        {
          $group: {
            _id: {
              city: { $ifNull: ['$location.city', 'Unspecified'] },
              skill: { $toLower: '$skillRequired' },
            },
            openJobs: { $sum: 1 },
            avgAdvertisedWage: { $avg: '$wageAmount' },
          },
        },
      ]),

      // Available workers grouped by city and skill
      WorkerProfile.aggregate([
        { $match: { availability: 'available' } },
        {
          $group: {
            _id: {
              city: { $ifNull: ['$location.city', 'Unspecified'] },
              skill: { $toLower: '$primarySkill' },
            },
            availableWorkers: { $sum: 1 },
          },
        },
      ]),

      // Active projects by city
      Project.aggregate([
        { $match: { status: { $in: ['in_progress', 'confirmed', 'completion_requested'] } } },
        {
          $group: {
            _id: { $ifNull: ['$location.city', 'Unspecified'] },
            activeProjects: { $sum: 1 },
          },
        },
      ]),
    ]);

    const gapMap = {};

    jobsAgg.forEach((j) => {
      const city = j._id.city;
      const skill = j._id.skill;
      const key = `${city}___${skill}`;
      gapMap[key] = {
        city,
        skill,
        openJobs: j.openJobs,
        availableWorkers: 0,
        avgWage: Math.round(j.avgAdvertisedWage || 0),
      };
    });

    workersAgg.forEach((w) => {
      const city = w._id.city;
      const skill = w._id.skill;
      const key = `${city}___${skill}`;
      if (!gapMap[key]) {
        gapMap[key] = {
          city,
          skill,
          openJobs: 0,
          availableWorkers: w.availableWorkers,
          avgWage: 0,
        };
      } else {
        gapMap[key].availableWorkers = w.availableWorkers;
      }
    });

    const activeProjectsMap = {};
    projectsAgg.forEach((p) => {
      activeProjectsMap[p._id] = p.activeProjects;
    });

    const tableRows = Object.values(gapMap).map((row) => {
      const demand = row.openJobs;
      const supply = row.availableWorkers;
      const gap = Math.max(0, demand - supply);
      return {
        city: row.city,
        skill: row.skill,
        openJobs: demand,
        availableWorkers: supply,
        gap,
        avgWage: row.avgWage,
        activeProjects: activeProjectsMap[row.city] || 0,
        alert: gap >= 3 ? 'Critical Shortage' : gap > 0 ? 'Moderate Shortage' : 'Balanced',
      };
    });

    // Sort by largest gap first
    tableRows.sort((a, b) => b.gap - a.gap);

    res.json({
      success: true,
      data: tableRows,
    });
  } catch (error) {
    next(error);
  }
};
