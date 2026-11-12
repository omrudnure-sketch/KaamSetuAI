import * as adminMonitoringService from '../services/adminMonitoringService.js';

export const getWorkerDirectory = async (req, res, next) => {
  try {
    const data = await adminMonitoringService.getWorkerDirectory(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getWorkerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await adminMonitoringService.getWorkerDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEmployerDirectory = async (req, res, next) => {
  try {
    const data = await adminMonitoringService.getEmployerDirectory(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEmployerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await adminMonitoringService.getEmployerDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProjectMonitoringList = async (req, res, next) => {
  try {
    const data = await adminMonitoringService.getProjectMonitoringList(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProjectMonitoringDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await adminMonitoringService.getProjectMonitoringDetails(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdminMonitoringOverview = async (req, res, next) => {
  try {
    const data = await adminMonitoringService.getAdminMonitoringOverview();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdminLiveActivityFeed = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const data = await adminMonitoringService.getAdminLiveActivityFeed(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdminGlobalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    const data = await adminMonitoringService.getAdminGlobalSearch(q);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

