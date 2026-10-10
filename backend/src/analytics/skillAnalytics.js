import { Job, WorkerProfile, HiringAgreement, Project } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getSkillAnalytics = async (query = {}) => {
  const { dateRangeLabel } = parseDateRange(query);

  const [
    openJobsBySkill,
    totalRelevantWorkers,
    availableWorkersBySkill,
    hiresBySkill,
    completedProjectsBySkill,
    avgJobWagesBySkill,
    avgAgreedWagesBySkill,
  ] = await Promise.all([
    // 1. Open jobs by skill
    Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: { $toLower: '$skillRequired' }, openJobs: { $sum: 1 } } },
    ]),

    // 2. Relevant workers by skill (primarySkill or skills array)
    WorkerProfile.aggregate([
      {
        $project: {
          allSkills: {
            $setUnion: [
              { $cond: [{ $ifNull: ['$primarySkill', false] }, [{ $toLower: '$primarySkill' }], []] },
              {
                $map: {
                  input: { $ifNull: ['$skills', []] },
                  as: 's',
                  in: { $toLower: '$$s' },
                },
              },
            ],
          },
        },
      },
      { $unwind: '$allSkills' },
      { $group: { _id: '$allSkills', relevantWorkers: { $sum: 1 } } },
    ]),

    // 3. Currently AVAILABLE workers by skill (availability === 'available')
    WorkerProfile.aggregate([
      { $match: { availability: 'available' } },
      {
        $project: {
          allSkills: {
            $setUnion: [
              { $cond: [{ $ifNull: ['$primarySkill', false] }, [{ $toLower: '$primarySkill' }], []] },
              {
                $map: {
                  input: { $ifNull: ['$skills', []] },
                  as: 's',
                  in: { $toLower: '$$s' },
                },
              },
            ],
          },
        },
      },
      { $unwind: '$allSkills' },
      { $group: { _id: '$allSkills', availableWorkers: { $sum: 1 } } },
    ]),

    // 4. Number of confirmed hires by skill (via Job skillRequired)
    HiringAgreement.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: '$jobDoc' },
      { $group: { _id: { $toLower: '$jobDoc.skillRequired' }, hiresCount: { $sum: 1 } } },
    ]),

    // 5. Completed projects by skill
    Project.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: '$jobDoc' },
      { $group: { _id: { $toLower: '$jobDoc.skillRequired' }, completedCount: { $sum: 1 } } },
    ]),

    // 6. Average advertised wage from Jobs (by skill)
    Job.aggregate([
      { $match: { status: 'open', wageAmount: { $gt: 0 } } },
      {
        $group: {
          _id: { $toLower: '$skillRequired' },
          avgAdvertisedWage: { $avg: '$wageAmount' },
        },
      },
    ]),

    // 7. Average agreed wage from confirmed HiringAgreements
    HiringAgreement.aggregate([
      { $match: { status: 'confirmed', agreedWage: { $gt: 0 } } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: '$jobDoc' },
      {
        $group: {
          _id: { $toLower: '$jobDoc.skillRequired' },
          avgAgreedWage: { $avg: '$agreedWage' },
        },
      },
    ]),
  ]);

  // Aggregate by skill
  const skillMap = {};

  const ensureSkill = (skill) => {
    if (!skill) return null;
    const key = skill.trim().toLowerCase();
    if (!skillMap[key]) {
      skillMap[key] = {
        skill: key,
        openJobs: 0,
        relevantWorkers: 0,
        availableWorkers: 0,
        hires: 0,
        completedProjects: 0,
        avgAdvertisedWage: null,
        avgAgreedWage: null,
      };
    }
    return skillMap[key];
  };

  openJobsBySkill.forEach((j) => {
    const s = ensureSkill(j._id);
    if (s) s.openJobs = j.openJobs;
  });

  totalRelevantWorkers.forEach((w) => {
    const s = ensureSkill(w._id);
    if (s) s.relevantWorkers = w.relevantWorkers;
  });

  availableWorkersBySkill.forEach((w) => {
    const s = ensureSkill(w._id);
    if (s) s.availableWorkers = w.availableWorkers;
  });

  hiresBySkill.forEach((h) => {
    const s = ensureSkill(h._id);
    if (s) s.hires = h.hiresCount;
  });

  completedProjectsBySkill.forEach((p) => {
    const s = ensureSkill(p._id);
    if (s) s.completedProjects = p.completedCount;
  });

  avgJobWagesBySkill.forEach((w) => {
    const s = ensureSkill(w._id);
    if (s) s.avgAdvertisedWage = Math.round(w.avgAdvertisedWage);
  });

  avgAgreedWagesBySkill.forEach((w) => {
    const s = ensureSkill(w._id);
    if (s) s.avgAgreedWage = Math.round(w.avgAgreedWage);
  });

  // Calculate Demand, Supply, and Gap
  const skills = Object.values(skillMap).map((item) => {
    const demand = item.openJobs;
    const supply = item.availableWorkers; // Only currently available workers count as supply!
    const gap = Math.max(0, demand - supply);

    return {
      skill: item.skill,
      openJobs: item.openJobs,
      relevantWorkers: item.relevantWorkers,
      availableWorkers: item.availableWorkers,
      hires: item.hires,
      completedProjects: item.completedProjects,
      avgAdvertisedWage: item.avgAdvertisedWage ? `₹${item.avgAdvertisedWage}` : 'N/A',
      avgAgreedWage: item.avgAgreedWage ? `₹${item.avgAgreedWage}` : 'N/A',
      demand,
      supply,
      gap,
      wageComparison: {
        advertised: item.avgAdvertisedWage || 0,
        agreed: item.avgAgreedWage || 0,
        source: 'Advertised wage from Job.wageAmount; agreed wage from HiringAgreement.agreedWage',
      },
    };
  });

  return {
    dateRange: dateRangeLabel,
    skills,
    definitions: {
      demand: 'Number of open jobs requiring this skill.',
      supply: 'Number of registered workers with this skill whose status is currently "available" (excluding busy or unavailable workers).',
      relevantWorkers: 'Total registered workers with matching primary or secondary skill, regardless of current availability.',
      gap: 'Estimated shortage: max(0, Demand - Supply). Indicates unfilled demand exceeding available workers.',
      wages: 'Distinguishes advertised rate on open jobs from negotiated rate on confirmed hiring agreements.',
    },
  };
};

export default getSkillAnalytics;
