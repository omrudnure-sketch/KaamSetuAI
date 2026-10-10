import * as adminService from '../services/adminService.js';

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const analytics = await adminService.getDashboardAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

export const getUsersList = async (req, res, next) => {
  try {
    const result = await adminService.getUsersList(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await adminService.updateUserStatus(id, req.body, req.user.id);
    res.json({ success: true, data: updatedUser, message: 'User status updated' });
  } catch (error) {
    next(error);
  }
};

export const getAllComplaints = async (req, res, next) => {
  try {
    const result = await adminService.getAllComplaints(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const resolveComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = await adminService.resolveComplaint(id, req.body, req.user.id);
    res.json({ success: true, data: complaint, message: 'Complaint resolved' });
  } catch (error) {
    next(error);
  }
};

export const getAllDisputes = async (req, res, next) => {
  try {
    const result = await adminService.getAllDisputes(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispute = await adminService.resolveDispute(id, req.body, req.user.id);
    res.json({ success: true, data: dispute, message: 'Dispute resolved' });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await adminService.getAuditLogs(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
