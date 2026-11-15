import { Job, WorkerProfile, Project, EmployerProfile, User } from '../models/index.js';

// Offline reference coordinates for major cities across Maharashtra and India
export const CITY_COORDINATES = {
  pune: [73.8567, 18.5204],
  mumbai: [72.8777, 19.076],
  'navi mumbai': [73.0297, 19.033],
  thane: [72.9781, 19.2183],
  nagpur: [79.0882, 21.1458],
  nashik: [73.7898, 19.9975],
  kolhapur: [74.2433, 16.705],
  'chhatrapati sambhajinagar': [75.3433, 19.8762],
  aurangabad: [75.3433, 19.8762],
  solapur: [75.9064, 17.6599],
  amravati: [77.7796, 20.9374],
  sangli: [74.5815, 16.8524],
  nanded: [77.321, 19.1383],
  jalgaon: [75.5626, 21.0077],
  akola: [77.0082, 20.7002],
  latur: [76.5604, 18.4088],
  dhule: [74.7749, 20.9042],
  ahmednagar: [74.748, 19.0948],
  satara: [73.999, 17.6805],
  ratnagiri: [73.312, 16.9902],
  rukadi: [74.3621, 16.7392],
  delhi: [77.209, 28.6139],
  bengaluru: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.385],
};

export const resolveCityCoordinates = (cityName) => {
  if (!cityName || typeof cityName !== 'string') return null;
  const clean = cityName.trim().toLowerCase();
  for (const [k, v] of Object.entries(CITY_COORDINATES)) {
    if (clean === k || clean.includes(k) || k.includes(clean)) return v; // [lng, lat]
  }
  return null;
};

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

// Helper: Haversine distance in kilometers
export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
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

// Helper: Safely normalize any aggregation or object value to a clean string
export const extractSafeString = (val, fallback = 'Unspecified') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.$ifNull) {
      const sub = Array.isArray(val.$ifNull) ? val.$ifNull[1] : val.$ifNull;
      return extractSafeString(sub, fallback);
    }
    const candidate = val.city || val.name || val.title || val.skill;
    if (candidate && typeof candidate !== 'object' && candidate !== val) return extractSafeString(candidate, fallback);
    return fallback;
  }
  return String(val);
};

// Helper: Recursively sanitize payloads so no MongoDB-style operator objects ($ifNull, etc.) reach JSON
export const sanitizeForJson = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(sanitizeForJson);
  if (typeof val === 'object') {
    if (val.$ifNull) {
      const sub = Array.isArray(val.$ifNull) ? val.$ifNull[1] : 'Unspecified';
      return sanitizeForJson(sub);
    }
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('$')) continue;
      clean[k] = sanitizeForJson(v);
    }
    return clean;
  }
  return String(val);
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

    let formattedJobs = jobs
      .filter((jobDoc) => {
        const j = jobDoc.toJSON ? jobDoc.toJSON() : { ...jobDoc };
        // Exclude jobs that are not open or whose requirement is fulfilled
        if (j.status !== 'open') return false;
        const needed = Number(j.workersRequired || j.workersNeeded || 1);
        if (j.assignedWorkersCount && Number(j.assignedWorkersCount) >= needed) return false;
        return true;
      })
      .map((jobDoc) => {
        const j = jobDoc.toJSON ? jobDoc.toJSON() : { ...jobDoc };
        let jLng = j.longitude;
        let jLat = j.latitude;
        if (jLng === undefined || jLat === undefined || (jLng === 0 && jLat === 0) || jLng === null || jLat === null) {
          if (Array.isArray(j.location?.coordinates)) {
            jLng = j.location.coordinates[0];
            jLat = j.location.coordinates[1];
          } else if (Array.isArray(j.location?.coordinates?.coordinates)) {
            jLng = j.location.coordinates.coordinates[0];
            jLat = j.location.coordinates.coordinates[1];
          } else if (j.location?.lng && j.location?.lat) {
            jLng = j.location.lng;
            jLat = j.location.lat;
          }
        }

        // City fallback lookup if GPS coordinates were not provided
        if (!isValidCoordinate(jLng, jLat)) {
          const cityCandidate = j.city || j.location?.city || (typeof j.location === 'string' ? j.location : '');
          const resolved = resolveCityCoordinates(cityCandidate);
          if (resolved) {
            jLng = resolved[0];
            jLat = resolved[1];
          }
        }

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
          workersRequired: Number(j.workersRequired || j.workersNeeded || 1),
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
    } else {
      // Default to returning only available workers on the map
      query.availability = 'available';
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

    let formattedWorkers = activeWorkers
      .map((workerDoc) => {
        const w = workerDoc.toJSON ? workerDoc.toJSON() : { ...workerDoc };
        let wLng = w.longitude;
        let wLat = w.latitude;

        if (wLng === undefined || wLat === undefined || (wLng === 0 && wLat === 0) || wLng === null || wLat === null) {
          if (Array.isArray(w.location?.coordinates)) {
            wLng = w.location.coordinates[0];
            wLat = w.location.coordinates[1];
          } else if (Array.isArray(w.location?.coordinates?.coordinates)) {
            wLng = w.location.coordinates.coordinates[0];
            wLat = w.location.coordinates.coordinates[1];
          } else if (w.location?.lng && w.location?.lat) {
            wLng = w.location.lng;
            wLat = w.location.lat;
          }
        }

        // City fallback lookup for offline/city-matched workers
        if (!isValidCoordinate(wLng, wLat)) {
          const cityCandidate = w.city || w.location?.city || (typeof w.location === 'string' ? w.location : '');
          const resolved = resolveCityCoordinates(cityCandidate);
          if (resolved) {
            wLng = resolved[0];
            wLat = resolved[1];
          }
        }

        const isAvail = w.isAvailableForWork !== false && w.availability !== 'unavailable';
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
          isAvailableForWork: isAvail,
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
      })
      // Only available workers with valid coordinates appear on the discovery map
      .filter((w) => w.isAvailableForWork && w.location.hasCoordinates);

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

    res.json(sanitizeForJson({
      success: true,
      data: supplyByCity.map((c) => ({
        city: extractSafeString(c._id, 'Unspecified'),
        totalWorkers: Number(c.totalWorkers || 0),
        availableWorkers: Number(c.availableWorkers || 0),
        verifiedWorkers: Number(c.verifiedWorkers || 0),
        avgWage: Math.round(Number(c.avgWage) || 0),
      })),
    }));
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

    res.json(sanitizeForJson({
      success: true,
      data: demandByCity.map((c) => ({
        city: extractSafeString(c._id, 'Unspecified'),
        openJobs: Number(c.openJobs || 0),
        workersNeeded: Number(c.workersNeeded || 0),
        avgWage: Math.round(Number(c.avgWage) || 0),
      })),
    }));
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
      const city = extractSafeString(j._id?.city || j._id, 'Unspecified');
      const skill = extractSafeString(j._id?.skill, 'General');
      const key = `${city}___${skill}`;
      gapMap[key] = {
        city,
        skill,
        openJobs: Number(j.openJobs) || 0,
        availableWorkers: 0,
        avgWage: Math.round(Number(j.avgAdvertisedWage) || 0),
      };
    });

    workersAgg.forEach((w) => {
      const city = extractSafeString(w._id?.city || w._id, 'Unspecified');
      const skill = extractSafeString(w._id?.skill, 'General');
      const key = `${city}___${skill}`;
      if (!gapMap[key]) {
        gapMap[key] = {
          city,
          skill,
          openJobs: 0,
          availableWorkers: Number(w.availableWorkers) || 0,
          avgWage: 0,
        };
      } else {
        gapMap[key].availableWorkers = Number(w.availableWorkers) || 0;
      }
    });

    const activeProjectsMap = {};
    projectsAgg.forEach((p) => {
      const pCity = extractSafeString(p._id, 'Unspecified');
      activeProjectsMap[pCity] = Number(p.activeProjects) || 0;
    });

    const tableRows = Object.values(gapMap).map((row) => {
      const demand = Number(row.openJobs || 0);
      const supply = Number(row.availableWorkers || 0);
      const gap = Math.max(0, demand - supply);
      const cityName = extractSafeString(row.city, 'Unspecified');
      const skillName = extractSafeString(row.skill, 'General');

      return {
        city: cityName,
        skill: skillName,
        openJobs: demand,
        availableWorkers: supply,
        gap,
        avgWage: Math.round(Number(row.avgWage) || 0),
        activeProjects: Number(activeProjectsMap[cityName] || 0),
        alert: gap >= 3 ? 'Critical Shortage' : gap > 0 ? 'Moderate Shortage' : 'Balanced',
      };
    });

    // Sort by largest gap first
    tableRows.sort((a, b) => b.gap - a.gap);

    res.json(sanitizeForJson({
      success: true,
      data: tableRows,
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/map/entities
 * Admin complete geospatial intelligence:
 * Available workers, busy/hired workers, employers, active jobs,
 * ongoing projects, completed projects, unfilled jobs, and unlocated records.
 */
export const getAdminGeoEntities = async (req, res, next) => {
  try {
    const [workers, employers, jobs, projects] = await Promise.all([
      WorkerProfile.find({}).populate('userId', 'name phone email status'),
      EmployerProfile.find({}).populate('userId', 'name phone email status'),
      Job.find({}).populate('employerId', 'name phone email'),
      Project.find({}).populate('employerId', 'name').populate('workers.workerId', 'name'),
    ]);

    const markers = [];
    const unlocated = [];

    // Helper to safely extract valid coordinates
    const extractCoords = (doc) => {
      let lng = doc.longitude;
      let lat = doc.latitude;
      if (lng === undefined || lat === undefined || (Number(lng) === 0 && Number(lat) === 0)) {
        if (Array.isArray(doc.location?.coordinates)) {
          lng = doc.location.coordinates[0];
          lat = doc.location.coordinates[1];
        } else if (Array.isArray(doc.location?.coordinates?.coordinates)) {
          lng = doc.location.coordinates.coordinates[0];
          lat = doc.location.coordinates.coordinates[1];
        }
      }
      const valid = isValidCoordinate(lng, lat);
      return {
        lng: valid ? Number(lng) : 0,
        lat: valid ? Number(lat) : 0,
        valid,
      };
    };

    // 1. Process Workers (Available vs Busy)
    workers.forEach((wDoc) => {
      const w = wDoc.toJSON ? wDoc.toJSON() : { ...wDoc };
      const { lng, lat, valid } = extractCoords(w);
      const isAvailable = w.availability === 'available' || (w.isAvailableForWork && w.availability !== 'busy');
      const type = isAvailable ? 'available_worker' : 'busy_worker';
      const city = w.city || w.location?.city || 'Unspecified';
      const name = w.fullName || w.userId?.name || 'Skilled Worker';
      const phone = w.phone || w.userId?.phone || '';
      const email = w.email || w.userId?.email || '';

      const payload = {
        id: String(w.id || w._id),
        entityType: 'worker',
        markerType: type,
        name,
        title: `${name} (${w.primarySkill || 'Worker'})`,
        skill: w.primarySkill || (Array.isArray(w.skills) ? w.skills[0] : 'General Worker'),
        skills: Array.isArray(w.skills) ? w.skills : [],
        dailyWage: Number(w.dailyWage) || 0,
        availability: w.availability || (isAvailable ? 'available' : 'busy'),
        verificationStatus: w.verificationStatus || 'unverified',
        rating: Number(w.rating) || 0,
        city,
        address: w.address || w.location?.address || '',
        phone,
        email,
        createdAt: w.createdAt,
      };

      if (valid) {
        markers.push({
          ...payload,
          coordinates: [lng, lat],
          hasCoordinates: true,
        });
      } else {
        unlocated.push({
          ...payload,
          hasCoordinates: false,
          reason: 'Missing GPS coordinates',
        });
      }
    });

    // 2. Process Employers
    employers.forEach((eDoc) => {
      const e = eDoc.toJSON ? eDoc.toJSON() : { ...eDoc };
      const { lng, lat, valid } = extractCoords(e);
      const city = e.city || e.location?.city || 'Unspecified';
      const name = e.companyName || e.userId?.name || 'Employer';
      const phone = e.phone || e.userId?.phone || '';
      const email = e.email || e.userId?.email || '';

      const payload = {
        id: String(e.id || e._id),
        entityType: 'employer',
        markerType: 'employer',
        name,
        title: `${name} (Employer)`,
        companyName: e.companyName || name,
        industry: e.industry || 'General Work',
        verificationStatus: e.verificationStatus || 'unverified',
        city,
        address: e.address || e.location?.address || '',
        phone,
        email,
        createdAt: e.createdAt,
      };

      if (valid) {
        markers.push({
          ...payload,
          coordinates: [lng, lat],
          hasCoordinates: true,
        });
      } else {
        unlocated.push({
          ...payload,
          hasCoordinates: false,
          reason: 'Missing GPS coordinates',
        });
      }
    });

    // 3. Process Jobs (Active vs Unfilled)
    jobs.forEach((jDoc) => {
      const j = jDoc.toJSON ? jDoc.toJSON() : { ...jDoc };
      const { lng, lat, valid } = extractCoords(j);
      const city = j.city || j.location?.city || (typeof j.location === 'string' ? j.location : '') || 'Unspecified';
      const isOpen = j.status === 'open';
      const isUnfilled = isOpen && (!j.assignedWorkersCount || j.assignedWorkersCount < (j.workersRequired || 1));
      const markerType = isUnfilled ? 'unfilled_job' : 'active_job';

      const payload = {
        id: String(j.id || j._id),
        entityType: 'job',
        markerType,
        name: j.title || 'Job Opportunity',
        title: j.title || 'Job Opportunity',
        skill: j.skillRequired || 'General Work',
        workersRequired: Number(j.workersRequired) || 1,
        wageAmount: Number(j.wageAmount) || 0,
        wageType: j.wageType || 'daily',
        status: j.status || 'open',
        employerName: j.employerId?.name || 'Employer',
        city,
        address: j.address || j.location?.address || '',
        createdAt: j.createdAt,
      };

      if (valid) {
        markers.push({
          ...payload,
          coordinates: [lng, lat],
          hasCoordinates: true,
        });
      } else {
        unlocated.push({
          ...payload,
          hasCoordinates: false,
          reason: 'Missing GPS coordinates',
        });
      }
    });

    // 4. Process Projects (Ongoing vs Completed)
    projects.forEach((pDoc) => {
      const p = pDoc.toJSON ? pDoc.toJSON() : { ...pDoc };
      const { lng, lat, valid } = extractCoords(p);
      const city = p.city || p.location?.city || 'Unspecified';
      const isCompleted = p.status === 'completed';
      const markerType = isCompleted ? 'completed_project' : 'ongoing_project';

      const payload = {
        id: String(p.id || p._id),
        entityType: 'project',
        markerType,
        name: p.name || p.title || 'Project',
        title: `${p.name || p.title || 'Project'} (${p.status})`,
        status: p.status || 'in_progress',
        progress: Number(p.progress || p.completionPercentage) || 0,
        employerName: p.employerId?.name || 'Employer',
        agreedWage: Number(p.agreedWage) || 0,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        city,
        address: p.address || p.location?.address || '',
        createdAt: p.createdAt,
      };

      if (valid) {
        markers.push({
          ...payload,
          coordinates: [lng, lat],
          hasCoordinates: true,
        });
      } else {
        unlocated.push({
          ...payload,
          hasCoordinates: false,
          reason: 'Missing GPS coordinates',
        });
      }
    });

    // 5. Regional Supply vs Demand Summary by City
    const citySummaryMap = {};
    const ensureCity = (cityName) => {
      const c = (cityName || 'Unspecified').trim();
      if (!citySummaryMap[c]) {
        citySummaryMap[c] = {
          city: c,
          availableWorkers: 0,
          busyWorkers: 0,
          totalWorkers: 0,
          totalEmployers: 0,
          totalJobs: 0,
          openJobs: 0,
          unfilledJobs: 0,
          ongoingProjects: 0,
          completedProjects: 0,
        };
      }
      return citySummaryMap[c];
    };

    workers.forEach((w) => {
      const cs = ensureCity(w.city || w.location?.city);
      cs.totalWorkers++;
      if (w.availability === 'available' || (w.isAvailableForWork && w.availability !== 'busy')) {
        cs.availableWorkers++;
      } else {
        cs.busyWorkers++;
      }
    });

    employers.forEach((e) => {
      const cs = ensureCity(e.city || e.location?.city);
      cs.totalEmployers++;
    });

    jobs.forEach((j) => {
      const cs = ensureCity(j.city || j.location?.city);
      cs.totalJobs++;
      if (j.status === 'open') {
        cs.openJobs++;
        cs.unfilledJobs++;
      }
    });

    projects.forEach((p) => {
      const cs = ensureCity(p.city || p.location?.city);
      if (p.status === 'completed') {
        cs.completedProjects++;
      } else {
        cs.ongoingProjects++;
      }
    });

    const supplyDemandSummary = Object.values(citySummaryMap).map((cs) => {
      const gap = Math.max(0, cs.openJobs - cs.availableWorkers);
      return {
        ...cs,
        gap,
        status: gap >= 3 ? 'Critical Shortage' : gap > 0 ? 'Moderate Shortage' : 'Balanced',
      };
    });

    supplyDemandSummary.sort((a, b) => b.gap - a.gap || b.openJobs - a.openJobs);

    res.json(sanitizeForJson({
      success: true,
      data: {
        markers,
        unlocated,
        counts: {
          totalMarkers: markers.length,
          totalUnlocated: unlocated.length,
          availableWorkers: markers.filter((m) => m.markerType === 'available_worker').length,
          busyWorkers: markers.filter((m) => m.markerType === 'busy_worker').length,
          employers: markers.filter((m) => m.markerType === 'employer').length,
          activeJobs: markers.filter((m) => m.markerType === 'active_job').length,
          unfilledJobs: markers.filter((m) => m.markerType === 'unfilled_job').length,
          ongoingProjects: markers.filter((m) => m.markerType === 'ongoing_project').length,
          completedProjects: markers.filter((m) => m.markerType === 'completed_project').length,
        },
        supplyDemandSummary,
      },
    }));
  } catch (error) {
    next(error);
  }
};
