import { Job, WorkerProfile, User, Review } from '../../models/index.js';
import { GoogleGenAI } from '@google/genai';

/**
 * Configurable weights for deterministic 7-factor matching score (Section 22.2)
 */
export const DEFAULT_WEIGHTS = {
  skillMatch: 0.35,
  location: 0.20,
  experience: 0.15,
  availability: 0.10,
  rating: 0.10,
  wageCompatibility: 0.05,
  workReliability: 0.05,
};

/**
 * Related skill taxonomy for trade-related eligibility and score mapping
 */
const RELATED_SKILLS_TAXONOMY = {
  electrician: ['wireman', 'electrical', 'wiring', 'appliance', 'technician', 'electronics'],
  plumber: ['pipefitter', 'sanitary', 'plumbing', 'drainage', 'fitter', 'waterproofing'],
  carpenter: ['woodwork', 'furniture', 'cabinet', 'carpentry', 'wood', 'shuttering'],
  painter: ['whitewash', 'distemper', 'polisher', 'painting', 'surface', 'varnish'],
  mason: ['bricklayer', 'concrete', 'tile layer', 'plasterer', 'civil', 'construction', 'stone'],
  welder: ['fabricator', 'blacksmith', 'metal worker', 'welding', 'iron'],
  helper: ['laborer', 'loader', 'construction worker', 'cleaner', 'general worker', 'assistant'],
  cleaner: ['sweeper', 'housekeeper', 'sanitation', 'helper', 'cleaning', 'janitor'],
};

/**
 * Calculate Great-circle distance between two coordinates in km (Haversine formula)
 * Note: MongoDB GeoJSON coordinates are [longitude, latitude]
 */
export const calculateDistanceKm = (coords1, coords2) => {
  if (
    !coords1 ||
    !coords2 ||
    !Array.isArray(coords1) ||
    !Array.isArray(coords2) ||
    coords1.length < 2 ||
    coords2.length < 2
  ) {
    return null;
  }

  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;

  // Ignore default dummy [0, 0] coordinates
  if ((lat1 === 0 && lng1 === 0) || (lat2 === 0 && lng2 === 0)) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10; // Round to 1 decimal place
};

/**
 * Check if a candidate skill matches the required skill or taxonomy
 */
export const checkSkillAffinity = (requiredSkill, candidatePrimary, candidateSkills = []) => {
  if (!requiredSkill) return { score: 50, matchType: 'unknown' };

  const req = requiredSkill.toLowerCase().trim();
  const primary = (candidatePrimary || '').toLowerCase().trim();
  const allCandidateSkills = [primary, ...candidateSkills.map((s) => (s || '').toLowerCase().trim())].filter(Boolean);

  // Exact match on primary skill
  if (primary === req) {
    return { score: 100, matchType: 'exact_primary' };
  }

  // Exact match in additional skills
  if (allCandidateSkills.includes(req)) {
    return { score: 90, matchType: 'exact_additional' };
  }

  // Substring / lemma match in primary skill
  if (primary.includes(req) || req.includes(primary)) {
    return { score: 85, matchType: 'partial_primary' };
  }

  // Morphological root / stem match in candidate skills (e.g., plumber <-> plumbing, painter <-> painting)
  const tradeStem = (str) => (str || '').replace(/(ing|er|ers|ed|work|man|men|s)$/i, '');
  const reqStem = tradeStem(req);
  if (
    reqStem.length >= 3 &&
    allCandidateSkills.some((s) => {
      const sStem = tradeStem(s);
      return sStem === reqStem || s.includes(reqStem) || req.includes(sStem);
    })
  ) {
    return { score: 85, matchType: 'partial_additional' };
  }

  // Related taxonomy check
  const related = RELATED_SKILLS_TAXONOMY[req] || [];
  const hasRelated = allCandidateSkills.some((skill) =>
    related.some((rel) => skill.includes(rel) || rel.includes(skill))
  );

  if (hasRelated) {
    return { score: 70, matchType: 'related_trade' };
  }

  return { score: 25, matchType: 'mismatch' };
};

/**
 * Calculate individual matching factors and transparent scoring (Layer 2)
 */
export const getMatchingFactors = (job, workerProfile, weights = DEFAULT_WEIGHTS) => {
  const missingInformation = [];

  // 1. Skill Match (Weight: 35%)
  const skillAffinity = checkSkillAffinity(
    job.skillRequired,
    workerProfile.primarySkill,
    workerProfile.skills || []
  );
  const skillScore = skillAffinity.score;

  // 2. Location Compatibility (Weight: 20%)
  let locationScore = 60; // neutral default
  let distanceKm = null;
  const jobCoords = job.location?.coordinates?.coordinates;
  const workerCoords = workerProfile.location?.coordinates?.coordinates;

  if (jobCoords && workerCoords) {
    distanceKm = calculateDistanceKm(jobCoords, workerCoords);
  }

  if (distanceKm !== null) {
    if (distanceKm <= 5) locationScore = 100;
    else if (distanceKm <= 10) locationScore = 90;
    else if (distanceKm <= 20) locationScore = 75;
    else if (distanceKm <= 40) locationScore = 60;
    else if (distanceKm <= 75) locationScore = 40;
    else locationScore = 20;
  } else {
    // Distance coordinates unavailable: use city/area compatibility (never invent distance)
    const jobCity = (job.location?.city || '').toLowerCase().trim();
    const workerCity = (workerProfile.location?.city || '').toLowerCase().trim();
    const jobArea = (job.location?.area || '').toLowerCase().trim();
    const workerArea = (workerProfile.location?.area || '').toLowerCase().trim();

    if (!jobCity || !workerCity) {
      missingInformation.push('Missing precise location/coordinates (neutral location baseline applied)');
      locationScore = 60;
    } else if (jobCity === workerCity) {
      if (jobArea && workerArea && jobArea === workerArea) {
        locationScore = 95;
      } else {
        locationScore = 85;
      }
    } else {
      locationScore = 35; // Different cities
    }
  }

  // 3. Experience Match (Weight: 15%)
  let experienceScore = 60;
  const expYears = Number(workerProfile.experienceYears);
  if (Number.isFinite(expYears)) {
    if (expYears >= 5) experienceScore = 100;
    else if (expYears >= 3) experienceScore = 85;
    else if (expYears >= 1) experienceScore = 70;
    else experienceScore = 50;
  } else {
    missingInformation.push('Experience years not recorded (neutral baseline applied)');
  }

  // 4. Availability Match (Weight: 10%)
  let availabilityScore = 70;
  const availability = workerProfile.availability || 'available';
  if (availability === 'available') {
    availabilityScore = 100;
  } else if (availability === 'busy') {
    availabilityScore = 50;
  } else if (availability === 'unavailable') {
    availabilityScore = 10;
  }

  // 5. Rating & Review History (Weight: 10%)
  let ratingScore = 70; // Fair neutral baseline for new workers with zero reviews
  const totalReviews = Number(workerProfile.totalReviews) || 0;
  const rating = Number(workerProfile.rating) || 0;

  if (totalReviews > 0) {
    ratingScore = Math.min(Math.round((rating / 5) * 100), 100);
  } else {
    missingInformation.push('No past reviews recorded yet (fair baseline applied)');
  }

  // 6. Wage Compatibility (Weight: 5%)
  let wageScore = 70;
  const workerWage = Number(workerProfile.dailyWage);
  const jobWage = Number(job.wageAmount);

  if (Number.isFinite(workerWage) && workerWage > 0 && Number.isFinite(jobWage) && jobWage > 0) {
    if (workerWage <= jobWage) {
      wageScore = 100;
    } else {
      const diffRatio = (workerWage - jobWage) / jobWage;
      if (diffRatio <= 0.15) wageScore = 80;
      else if (diffRatio <= 0.30) wageScore = 60;
      else wageScore = 35;
    }
  } else {
    missingInformation.push('Worker expected daily wage not specified (neutral baseline applied)');
  }

  // 7. Work Reliability & Completed Projects (Weight: 5%)
  let reliabilityScore = 60;
  const completedProjects = Number(workerProfile.completedProjects) || 0;
  if (completedProjects >= 5) reliabilityScore = 100;
  else if (completedProjects >= 2) reliabilityScore = 85;
  else if (completedProjects >= 1) reliabilityScore = 70;
  else reliabilityScore = 60;

  // Composite Weighted Score Calculation
  const compositeScore = Math.round(
    skillScore * weights.skillMatch +
    locationScore * weights.location +
    experienceScore * weights.experience +
    availabilityScore * weights.availability +
    ratingScore * weights.rating +
    wageScore * weights.wageCompatibility +
    reliabilityScore * weights.workReliability
  );

  const clampedScore = Math.min(Math.max(compositeScore, 0), 100);

  return {
    score: clampedScore,
    factors: {
      skill: { score: skillScore, matchType: skillAffinity.matchType, weight: weights.skillMatch },
      location: { score: locationScore, distanceKm, weight: weights.location },
      experience: { score: experienceScore, years: workerProfile.experienceYears || 0, weight: weights.experience },
      availability: { score: availabilityScore, status: availability, weight: weights.availability },
      rating: { score: ratingScore, rating: workerProfile.rating || 0, totalReviews, weight: weights.rating },
      wage: { score: wageScore, workerWage, jobWage, weight: weights.wageCompatibility },
      reliability: { score: reliabilityScore, completedProjects, weight: weights.workReliability },
    },
    missingInformation,
  };
};

/**
 * Generate human-readable, transparent explanation based on factor breakdown
 */
export const explainMatch = (factors, workerProfile, job) => {
  const points = [];

  // Skill factor explanation
  if (factors.skill.matchType === 'exact_primary') {
    points.push(`Exact primary skill match for ${job.skillRequired}`);
  } else if (factors.skill.matchType === 'exact_additional') {
    points.push(`Skilled in ${job.skillRequired}`);
  } else if (factors.skill.matchType === 'related_trade') {
    points.push(`Experience in related trade skills`);
  }

  // Location factor explanation
  if (factors.location.distanceKm !== null) {
    points.push(`Located ~${factors.location.distanceKm} km away`);
  } else if (workerProfile.location?.city && job.location?.city) {
    if (workerProfile.location.city.toLowerCase() === job.location.city.toLowerCase()) {
      points.push(`Based locally in ${workerProfile.location.city}`);
    }
  }

  // Availability factor explanation
  if (factors.availability.status === 'available') {
    points.push('Currently marked available');
  }

  // Experience factor explanation
  if (factors.experience.years >= 3) {
    points.push(`${factors.experience.years} years of trade experience`);
  }

  // Rating factor explanation
  if (factors.rating.totalReviews > 0) {
    points.push(`${factors.rating.rating}★ rating over ${factors.rating.totalReviews} review(s)`);
  }

  if (points.length === 0) {
    return 'Meets preliminary trade eligibility requirements.';
  }

  return points.join(', ') + '.';
};

/**
 * Calculate single match score & breakdown between a job and a worker profile
 */
export const calculateMatchScore = (job, workerProfile, weights = DEFAULT_WEIGHTS) => {
  const factorResult = getMatchingFactors(job, workerProfile, weights);
  const explanation = explainMatch(factorResult.factors, workerProfile, job);

  return {
    score: factorResult.score,
    factors: factorResult.factors,
    explanation,
    missingInformation: factorResult.missingInformation,
  };
};

/**
 * Recommend suitable workers for an employer's job (Section 22.2)
 *
 * Layer 1: Eligibility filtering (Status, open job, skill match or related, active worker account)
 * Layer 2: Deterministic 7-factor scoring and ranking
 * Layer 3: Factual transparency and defensive pagination
 */
export const recommendWorkersForJob = async (jobId, employerUserId, options = {}) => {
  const { page = 1, limit = 10, minScore = 30 } = options;

  // 1. Fetch Job and verify ownership
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    throw error;
  }

  if (job.employerId.toString() !== employerUserId.toString()) {
    const error = new Error('Unauthorized: You can only view recommendations for jobs you own');
    error.status = 403;
    throw error;
  }

  if (job.status !== 'open') {
    return {
      job: {
        id: job._id,
        title: job.title,
        skillRequired: job.skillRequired,
        status: job.status,
      },
      results: [],
      pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
      notice: 'Job is not open. Closed or non-active jobs cannot receive worker recommendations.',
    };
  }

  // 2. Layer 1: Query eligible workers from MongoDB
  // Exclude suspended/blocked accounts by joining User status
  // We query WorkerProfiles whose primarySkill matches or is related, or who are generally active
  const activeUsers = await User.find({ status: 'active', role: 'worker' }).select('_id status').lean();
  const activeUserIds = activeUsers.map((u) => u._id);

  if (activeUserIds.length === 0) {
    return {
      job: { id: job._id, title: job.title, skillRequired: job.skillRequired },
      results: [],
      pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
    };
  }

  // Find candidate worker profiles
  const candidateProfiles = await WorkerProfile.find({
    userId: { $in: activeUserIds },
    availability: { $ne: 'unavailable' }, // exclude unavailable workers
  })
    .populate('userId', 'name phone email status isVerified')
    .lean();

  // 3. Layer 2: Score candidates and filter by minScore
  const scoredCandidates = [];

  for (const profile of candidateProfiles) {
    if (!profile.userId) continue;

    const matchAnalysis = calculateMatchScore(job, profile);

    // Filter out if score is below minScore
    if (matchAnalysis.score < minScore) continue;

    // Filter out completely unrelated skills unless high proximity/availability
    if (matchAnalysis.factors.skill.matchType === 'mismatch' && matchAnalysis.score < 50) {
      continue;
    }

    scoredCandidates.push({
      workerId: profile.userId._id,
      workerProfileId: profile._id,
      workerName: profile.fullName || profile.userId.name || 'Worker',
      primarySkill: profile.primarySkill,
      skills: profile.skills || [],
      experience: profile.experienceYears || 0,
      approximateDistance: matchAnalysis.factors.location.distanceKm,
      availability: profile.availability || 'available',
      dailyWage: profile.dailyWage,
      rating: profile.rating || 0,
      totalReviews: profile.totalReviews || 0,
      completedProjects: profile.completedProjects || 0,
      isVerified: profile.verificationStatus === 'verified' || !!profile.userId.isVerified,
      matchScore: matchAnalysis.score,
      matchingFactors: matchAnalysis.factors,
      explanation: matchAnalysis.explanation,
      missingInformation: matchAnalysis.missingInformation,
    });
  }

  // 4. Rank descending by matchScore
  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

  // 5. Paginate results
  const total = scoredCandidates.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedResults = scoredCandidates.slice(startIndex, startIndex + limit);

  return {
    job: {
      id: job._id,
      title: job.title,
      skillRequired: job.skillRequired,
      location: job.location?.city,
      wageAmount: job.wageAmount,
      wageType: job.wageType,
      status: job.status,
    },
    results: paginatedResults,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
};

/**
 * Recommend suitable jobs for a worker (Section 22.2 & 22.6)
 */
export const recommendJobsForWorker = async (workerUserId, options = {}) => {
  const { page = 1, limit = 10, minScore = 30 } = options;

  // 1. Fetch Worker Profile
  const workerProfile = await WorkerProfile.findOne({ userId: workerUserId }).lean();
  if (!workerProfile) {
    const error = new Error('Worker profile not found. Please complete your profile to view job recommendations.');
    error.status = 404;
    throw error;
  }

  // 2. Fetch Open Jobs
  const openJobs = await Job.find({ status: 'open' })
    .populate('employerId', 'name email status isVerified')
    .lean();

  const scoredJobs = [];

  for (const job of openJobs) {
    if (!job.employerId || job.employerId.status !== 'active') continue;

    const matchAnalysis = calculateMatchScore(job, workerProfile);

    if (matchAnalysis.score < minScore) continue;

    if (matchAnalysis.factors.skill.matchType === 'mismatch' && matchAnalysis.score < 50) {
      continue;
    }

    scoredJobs.push({
      jobId: job._id,
      jobTitle: job.title,
      skillRequired: job.skillRequired,
      additionalSkills: job.additionalSkills || [],
      employerName: job.employerId?.name || 'Employer',
      location: `${job.location?.city || ''}${job.location?.area ? ', ' + job.location.area : ''}`,
      city: job.location?.city,
      wage: job.wageAmount,
      wageType: job.wageType,
      durationType: job.durationType,
      startDate: job.startDate,
      matchScore: matchAnalysis.score,
      matchingFactors: matchAnalysis.factors,
      explanation: matchAnalysis.explanation,
      approximateDistance: matchAnalysis.factors.location.distanceKm,
    });
  }

  // Sort descending by score
  scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

  // Paginate
  const total = scoredJobs.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedResults = scoredJobs.slice(startIndex, startIndex + limit);

  return {
    worker: {
      id: workerUserId,
      primarySkill: workerProfile.primarySkill,
      city: workerProfile.location?.city,
    },
    results: paginatedResults,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
};

export default {
  DEFAULT_WEIGHTS,
  calculateDistanceKm,
  checkSkillAffinity,
  getMatchingFactors,
  explainMatch,
  calculateMatchScore,
  recommendWorkersForJob,
  recommendJobsForWorker,
};
