import * as adminDashboardService from '../services/adminDashboardService.js';

export const getDashboardOverview = async (req, res, next) => {
  try {
    const overview = await adminDashboardService.getDashboardOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};

export const getDelayedProjects = async (req, res, next) => {
  try {
    const projects = await adminDashboardService.getDelayedProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};
