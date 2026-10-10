import ProgressUpdate from '../models/ProgressUpdate.js';
import Project from '../models/Project.js';
import ProjectWorker from '../models/ProjectWorker.js';

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const createOrUpdateDailyProgress = async (workerId, projectId, payload) => {
  const { percentage, description, tasksCompleted, blockers, expectedCompletionDate, photos } = payload;
  const dateStr = payload.date || getTodayDateString();

  if (percentage < 0 || percentage > 100) {
    const error = new Error('Progress percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

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

  let progress = await ProgressUpdate.findOne({
    projectWorkerId: projectWorker._id,
    date: dateStr,
  });

  if (progress) {
    progress.percentage = percentage;
    if (description !== undefined) progress.description = description;
    if (tasksCompleted) progress.tasksCompleted = tasksCompleted;
    if (blockers) progress.blockers = blockers;
    if (expectedCompletionDate !== undefined) {
      progress.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : null;
    }
    if (photos) progress.photos = photos;
  } else {
    progress = new ProgressUpdate({
      projectId: project._id,
      projectWorkerId: projectWorker._id,
      workerId,
      date: dateStr,
      percentage,
      description: description || '',
      tasksCompleted: tasksCompleted || [],
      blockers: blockers || [],
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
      photos: photos || [],
    });
  }

  await progress.save();

  // Deterministic MVP Rule: Update overall project progress percentage to highest reported valid percentage (max 100)
  const newOverall = Math.min(100, Math.max(project.progressPercentage || 0, percentage));
  if (newOverall !== project.progressPercentage) {
    project.progressPercentage = newOverall;
    await project.save();
  }

  return progress;
};

export const getProjectProgress = async (userId, userRole, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'employer') {
    if (project.employerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized access to project progress updates');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const projectWorker = await ProjectWorker.findOne({ projectId, workerId: userId });
    if (!projectWorker) {
      const error = new Error('Unauthorized access to project progress updates');
      error.statusCode = 403;
      throw error;
    }
  }

  const updates = await ProgressUpdate.find({ projectId })
    .populate('workerId', 'name email phone')
    .sort({ date: -1, createdAt: -1 });

  return updates;
};

export const getWorkerProgress = async (workerId) => {
  const updates = await ProgressUpdate.find({ workerId })
    .populate('projectId', 'name status progressPercentage')
    .sort({ createdAt: -1 });

  return updates;
};

export const getProgressByDate = async (userId, userRole, projectId, dateStr) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (userRole === 'employer') {
    if (project.employerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized access to project progress updates');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const projectWorker = await ProjectWorker.findOne({ projectId, workerId: userId });
    if (!projectWorker) {
      const error = new Error('Unauthorized access to project progress updates');
      error.statusCode = 403;
      throw error;
    }
  }

  const updates = await ProgressUpdate.find({ projectId, date: dateStr })
    .populate('workerId', 'name email phone')
    .sort({ createdAt: -1 });

  return updates;
};
