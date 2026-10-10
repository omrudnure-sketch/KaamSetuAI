import {
  checkInWorker,
  checkOutWorker,
  getWorkerAttendance,
  getProjectAttendance,
  getAttendanceForDate,
} from '../services/attendanceService.js';
import { validateCheckIn, validateCheckOut } from '../validators/attendanceValidator.js';

export const handleCheckIn = async (req, res, next) => {
  try {
    const validation = validateCheckIn(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const attendance = await checkInWorker(req.user.id, validation.data);
    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

export const handleCheckOut = async (req, res, next) => {
  try {
    const validation = validateCheckOut(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const attendance = await checkOutWorker(req.user.id, validation.data);
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkerAttendance = async (req, res, next) => {
  try {
    const records = await getWorkerAttendance(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetProjectAttendance = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const records = await getProjectAttendance(req.user.id, req.user.role, projectId);
    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetAttendanceByDate = async (req, res, next) => {
  try {
    const { projectId, date } = req.params;
    const records = await getAttendanceForDate(req.user.id, req.user.role, projectId, date);
    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};
