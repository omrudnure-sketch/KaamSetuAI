import {
  createJobForEmployer,
  getEmployerJobs as fetchEmployerJobs,
  getEmployerJobById as fetchEmployerJobById,
  updateEmployerJob,
  closeEmployerJob,
  getAvailableJobs as fetchAvailableJobs,
  getJobByIdForWorker,
} from '../services/jobService.js';
import { validateCreateJob, validateUpdateJob } from '../validators/jobValidator.js';

export const createJob = async (req, res, next) => {
  try {
    const validation = validateCreateJob(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const job = await createJobForEmployer(req.user.id, validation.data);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployerJobs = async (req, res, next) => {
  try {
    const jobs = await fetchEmployerJobs(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployerJobById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin' || Boolean(req.user?.adminRole);
    const job = await fetchEmployerJobById(req.user.id, id, isAdmin);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found or access unauthorized',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validation = validateUpdateJob(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const updatedJob = await updateEmployerJob(req.user.id, id, validation.data);
    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found or access unauthorized',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

export const closeJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const closedJob = await closeEmployerJob(req.user.id, id);
    if (!closedJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found or access unauthorized',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: closedJob,
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableJobs = async (req, res, next) => {
  try {
    const result = await fetchAvailableJobs(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await getJobByIdForWorker(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Open job not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};
