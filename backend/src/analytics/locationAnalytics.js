import { Job, WorkerProfile, Project } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getLocationAnalytics = async (query = {}) => {
  const { dateRangeLabel } = parseDateRange(query);

  const [
    jobCities,
    workerCities,
    availableWorkerCities,
    projectCities,
    avgWageByCity,
  ] = await Promise.all([
    // Open jobs by city
    Job.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$location.city', openJobs: { $sum: 1 } } },
    ]),

    // Total workers by city
    WorkerProfile.aggregate([
      { $group: { _id: '$location.city', totalWorkers: { $sum: 1 } } },
    ]),

    // Available workers by city
    WorkerProfile.aggregate([
      { $match: { availability: 'available' } },
      { $group: { _id: '$location.city', availableWorkers: { $sum: 1 } } },
    ]),

    // Active projects by city
    Project.aggregate([
      { $match: { status: { $in: ['in_progress', 'confirmed', 'completion_requested'] } } },
      { $group: { _id: '$location.city', activeProjects: { $sum: 1 } } },
    ]),

    // Average advertised wage by city
    Job.aggregate([
      { $match: { wageAmount: { $gt: 0 } } },
      { $group: { _id: '$location.city', avgWage: { $avg: '$wageAmount' } } },
    ]),
  ]);

  const locationMap = {};

  const ensureLocation = (rawCity) => {
    const city = (rawCity && rawCity.trim()) ? rawCity.trim() : 'Unspecified';
    if (!locationMap[city]) {
      locationMap[city] = {
        city,
        openJobs: 0,
        totalWorkers: 0,
        availableWorkers: 0,
        activeProjects: 0,
        avgWage: 0,
      };
    }
    return locationMap[city];
  };

  jobCities.forEach((j) => {
    ensureLocation(j._id).openJobs = j.openJobs;
  });

  workerCities.forEach((w) => {
    ensureLocation(w._id).totalWorkers = w.totalWorkers;
  });

  availableWorkerCities.forEach((w) => {
    ensureLocation(w._id).availableWorkers = w.availableWorkers;
  });

  projectCities.forEach((p) => {
    ensureLocation(p._id).activeProjects = p.activeProjects;
  });

  avgWageByCity.forEach((w) => {
    ensureLocation(w._id).avgWage = Math.round(w.avgWage || 0);
  });

  const locations = Object.values(locationMap).map((loc) => {
    const demand = loc.openJobs;
    const supply = loc.availableWorkers;
    const gap = Math.max(0, demand - supply);

    return {
      ...loc,
      demand,
      supply,
      gap,
    };
  });

  return {
    dateRange: dateRangeLabel,
    locations,
  };
};

export default getLocationAnalytics;
