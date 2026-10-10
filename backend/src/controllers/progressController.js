import {
  createOrUpdateDailyProgress,
  getProjectProgress as fetchProjectProgress,
  getWorkerProgress as fetchWorkerProgress,
  getProgressByDate as fetchProgressByDate,
} from '../services/progressService.js';
import { validateProgressInput } from '../validators/progressValidator.js';

export const handleCreateOrUpdateProgress = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const validation = validateProgressInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const progress = await createOrUpdateDailyProgress(req.user.id, projectId, validation.data);
    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetProjectProgress = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const updates = await fetchProjectProgress(req.user.id, req.user.role, projectId);
    res.status(200).json({
      success: true,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkerProgress = async (req, res, next) => {
  try {
    const updates = await fetchWorkerProgress(req.user.id);
    res.status(200).json({
      success: true,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetProgressByDate = async (req, res, next) => {
  try {
    const { projectId, date } = req.params;
    const updates = await fetchProgressByDate(req.user.id, req.user.role, projectId, date);
    res.status(200).json({
      success: true,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};
