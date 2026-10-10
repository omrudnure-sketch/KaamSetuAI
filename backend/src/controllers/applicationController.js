import {
  applyToJob,
  getWorkerApplications,
  getEmployerApplications,
  shortlistApplication,
  selectApplication,
  rejectApplication,
  withdrawApplication,
} from '../services/applicationService.js';
import { validateCreateApplication } from '../validators/applicationValidator.js';

export const handleApplyToJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const validation = validateCreateApplication({ ...req.body, jobId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const application = await applyToJob(req.user.id, validation.data);
    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkerApplications = async (req, res, next) => {
  try {
    const applications = await getWorkerApplications(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetEmployerApplications = async (req, res, next) => {
  try {
    const applications = await getEmployerApplications(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

export const handleShortlistApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await shortlistApplication(req.user.id, id);
    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const handleSelectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await selectApplication(req.user.id, id);
    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await rejectApplication(req.user.id, id);
    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const handleWithdrawApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await withdrawApplication(req.user.id, id);
    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
