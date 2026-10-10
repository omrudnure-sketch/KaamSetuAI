import { getOverviewAnalytics } from '../analytics/overviewAnalytics.js';
import { getUserAnalytics } from '../analytics/userAnalytics.js';
import { getHiringAnalytics } from '../analytics/hiringAnalytics.js';
import { getProjectAnalytics } from '../analytics/projectAnalytics.js';
import { getAttendanceAnalytics } from '../analytics/attendanceAnalytics.js';
import { getPaymentAnalytics } from '../analytics/paymentAnalytics.js';
import { getSkillAnalytics } from '../analytics/skillAnalytics.js';
import { getLocationAnalytics } from '../analytics/locationAnalytics.js';

export const getOverview = async (req, res, next) => {
  try {
    const data = await getOverviewAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const data = await getUserAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getHiring = async (req, res, next) => {
  try {
    const data = await getHiringAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const data = await getProjectAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const data = await getAttendanceAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const data = await getPaymentAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSkills = async (req, res, next) => {
  try {
    const data = await getSkillAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (req, res, next) => {
  try {
    const data = await getLocationAnalytics(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
