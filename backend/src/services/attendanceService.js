import Attendance from '../models/Attendance.js';
import Project from '../models/Project.js';
import ProjectWorker from '../models/ProjectWorker.js';

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const checkInWorker = async (workerId, payload) => {
  const { projectId, notes, location } = payload;
  const dateStr = payload.date || getTodayDateString();

  const projectWorker = await ProjectWorker.findOne({ projectId, workerId });
  if (!projectWorker) {
    const error = new Error('Unauthorized: You are not assigned to this project');
    error.statusCode = 403;
    throw error;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (project.status !== 'in_progress') {
    const error = new Error(`Cannot check in when project status is '${project.status}'. Project must be 'in_progress'.`);
    error.statusCode = 400;
    throw error;
  }

  let attendance = await Attendance.findOne({
    projectWorkerId: projectWorker._id,
    date: dateStr,
  });

  if (attendance && attendance.checkIn) {
    const error = new Error('Worker has already checked in for today');
    error.statusCode = 409;
    throw error;
  }

  if (!attendance) {
    attendance = new Attendance({
      projectId: project._id,
      projectWorkerId: projectWorker._id,
      workerId,
      employerId: project.employerId,
      date: dateStr,
      checkIn: new Date(),
      status: 'present',
      notes: notes || '',
      checkInLocation: location || { type: 'Point', coordinates: [0, 0] },
    });
  } else {
    attendance.checkIn = new Date();
    attendance.status = 'present';
    if (notes) attendance.notes = notes;
    if (location) attendance.checkInLocation = location;
  }

  await attendance.save();
  return attendance;
};

export const checkOutWorker = async (workerId, payload) => {
  const { projectId, notes, location } = payload;
  const dateStr = payload.date || getTodayDateString();

  const projectWorker = await ProjectWorker.findOne({ projectId, workerId });
  if (!projectWorker) {
    const error = new Error('Unauthorized: You are not assigned to this project');
    error.statusCode = 403;
    throw error;
  }

  const attendance = await Attendance.findOne({
    projectWorkerId: projectWorker._id,
    date: dateStr,
  });

  if (!attendance || !attendance.checkIn) {
    const error = new Error('Cannot check out without checking in first for today');
    error.statusCode = 400;
    throw error;
  }

  if (attendance.checkOut) {
    const error = new Error('Worker has already checked out for today');
    error.statusCode = 409;
    throw error;
  }

  attendance.checkOut = new Date();
  if (notes) attendance.notes = notes;
  if (location) attendance.checkOutLocation = location;

  await attendance.save();
  return attendance;
};

export const getWorkerAttendance = async (workerId, query = {}) => {
  const filter = { workerId };
  if (query.projectId) filter.projectId = query.projectId;

  const records = await Attendance.find(filter)
    .populate('projectId', 'name status')
    .sort({ createdAt: -1 });

  return records;
};

export const getProjectAttendance = async (userId, userRole, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'employer') {
    if (project.employerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized access to project attendance');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const projectWorker = await ProjectWorker.findOne({ projectId, workerId: userId });
    if (!projectWorker) {
      const error = new Error('Unauthorized access to project attendance');
      error.statusCode = 403;
      throw error;
    }
  }

  const records = await Attendance.find({ projectId })
    .populate('workerId', 'name email phone')
    .sort({ date: -1, createdAt: -1 });

  return records;
};

export const getAttendanceForDate = async (userId, userRole, projectId, dateStr) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'employer') {
    if (project.employerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized access to project attendance');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const projectWorker = await ProjectWorker.findOne({ projectId, workerId: userId });
    if (!projectWorker) {
      const error = new Error('Unauthorized access to project attendance');
      error.statusCode = 403;
      throw error;
    }
  }

  const records = await Attendance.find({ projectId, date: dateStr })
    .populate('workerId', 'name email phone')
    .sort({ createdAt: -1 });

  return records;
};
