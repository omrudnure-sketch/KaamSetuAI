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

    const hasSearchCoords = isValidCoordinate(lng, lat);
    const searchLat = Number(lat);
    const searchLng = Number(lng);
    const searchRadiusKm = Number(distance) || 25;

    const jobs = await Job.find(query)
      .populate('employerId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    let formattedJobs = jobs.map((jobDoc) => {
      const j = jobDoc.toJSON ? jobDoc.toJSON() : { ...jobDoc };
      const jLng = j.longitude ?? (j.location?.coordinates?.coordinates?.[0] ?? 0);
      const jLat = j.latitude ?? (j.location?.coordinates?.coordinates?.[1] ?? 0);
      const hasCoords = isValidCoordinate(jLng, jLat);
      const coords = [Number(jLng) || 0, Number(jLat) || 0];

      let distanceKm = null;
      if (hasSearchCoords && hasCoords) {
        distanceKm = haversineDistanceKm(searchLat, searchLng, Number(jLat), Number(jLng));
      }

      return {
        _id: j.id || j._id,
        id: j.id || j._id,
        title: j.title,
        skillRequired: j.skillRequired,
        workersRequired: j.workersRequired,
        wageType: j.wageType,
        wageAmount: j.wageAmount,
        durationType: j.durationType,
        startDate: j.startDate,
        workingHours: j.workingHours,
        distanceKm,
        location: {
          city: j.city || j.location?.city || (typeof j.location === 'string' ? j.location : '') || 'Unspecified',
          area: j.area || j.location?.area || '',
          address: j.address || j.location?.address || '',
          coordinates: coords, // [lng, lat]
          hasCoordinates: hasCoords,
        },
        employer: {
          name: j.employerId?.name || 'Employer',
        },
      };
    });

    if (hasSearchCoords) {
      formattedJobs = formattedJobs.filter((j) => !j.location.hasCoordinates || j.distanceKm === null || j.distanceKm <= searchRadiusKm);
      formattedJobs.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

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

    const hasSearchCoords = isValidCoordinate(lng, lat);
    const searchLat = Number(lat);
    const searchLng = Number(lng);
    const searchRadiusKm = Number(distance) || 25;

    // Populate user status to ensure only active users appear
    const workers = await WorkerProfile.find(query)
      .populate('userId', 'status')
      .limit(100);

    // Filter out inactive or suspended accounts
    const activeWorkers = workers.filter((w) => !w.userId || w.userId.status === 'active');

    let formattedWorkers = activeWorkers.map((workerDoc) => {
      const w = workerDoc.toJSON ? workerDoc.toJSON() : { ...workerDoc };
      const wLng = w.longitude ?? (w.location?.coordinates?.coordinates?.[0] ?? 0);
      const wLat = w.latitude ?? (w.location?.coordinates?.coordinates?.[1] ?? 0);
      const rawCoords = [Number(wLng) || 0, Number(wLat) || 0];
      const approxCoords = approximateCoordinates(rawCoords);

      let distanceKm = null;
      if (hasSearchCoords && isValidCoordinate(wLng, wLat)) {
        distanceKm = haversineDistanceKm(searchLat, searchLng, Number(wLat), Number(wLng));
      }

      return {
        _id: w.id || w._id,
        id: w.id || w._id,
        fullName: w.fullName || 'Skilled Worker',
        primarySkill: w.primarySkill || (Array.isArray(w.skills) ? w.skills[0] : 'General Worker'),
        skills: w.skills || [],
        experienceYears: w.experienceYears || 0,
        dailyWage: w.dailyWage || 0,
        availability: w.availability || 'available',
        isAvailableForWork: w.isAvailableForWork ?? (w.availability !== 'unavailable'),
        verificationStatus: w.verificationStatus,
        rating: w.rating || 0,
        totalReviews: w.totalReviews || w.reviewCount || 0,
        distanceKm,
        location: {
          city: w.city || w.location?.city || 'Unspecified',
          area: w.area || w.location?.area || '',
          coordinates: approxCoords || [0, 0], // Approximate for privacy!
          hasCoordinates: approxCoords !== null,
        },
      };
    });

    if (hasSearchCoords) {
      formattedWorkers = formattedWorkers.filter((w) => !w.location.hasCoordinates || w.distanceKm === null || w.distanceKm <= searchRadiusKm);
      formattedWorkers.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

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
