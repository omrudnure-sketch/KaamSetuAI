import {
  createFromConfirmedAgreement,
  getWorkerProjects as fetchWorkerProjects,
  getEmployerProjects as fetchEmployerProjects,
  getProject as fetchProject,
  startProject as executeStartProject,
  requestCompletion as executeRequestCompletion,
  completeProject as executeCompleteProject,
  cancelProject as executeCancelProject,
} from '../services/projectService.js';
import { validateProjectInput } from '../validators/projectValidator.js';

export const createProjectFromAgreement = async (req, res, next) => {
  try {
    const { agreementId } = req.params;
    const validation = validateProjectInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const result = await createFromConfirmedAgreement(req.user.id, agreementId, validation.data);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerProjects = async (req, res, next) => {
  try {
    const projects = await fetchWorkerProjects(req.user.id);
    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployerProjects = async (req, res, next) => {
  try {
    const projects = await fetchEmployerProjects(req.user.id);
    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await fetchProject(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const startProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await executeStartProject(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const requestCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await executeRequestCompletion(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const completeProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await executeCompleteProject(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await executeCancelProject(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};
