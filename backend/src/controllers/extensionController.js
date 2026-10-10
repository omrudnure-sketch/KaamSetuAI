import * as extensionService from '../services/extensionService.js';
import { validateExtensionInput } from '../validators/extensionValidator.js';

export const requestExtension = async (req, res) => {
  try {
    const { projectId } = req.params;
    const validation = validateExtensionInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const extension = await extensionService.createRequest(req.user, projectId, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Project extension requested successfully',
      data: extension,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to request project extension',
    });
  }
};

export const approveExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const extension = await extensionService.approveRequest(req.user, id);
    return res.status(200).json({
      success: true,
      message: extension.status === 'approved' ? 'Extension request approved and applied' : 'Extension request approval updated',
      data: extension,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to approve extension request',
    });
  }
};

export const rejectExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const extension = await extensionService.rejectRequest(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Extension request rejected',
      data: extension,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to reject extension request',
    });
  }
};

export const cancelExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const extension = await extensionService.cancelRequest(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Extension request cancelled',
      data: extension,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to cancel extension request',
    });
  }
};

export const getProjectExtensions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const extensions = await extensionService.getProjectExtensions(req.user, projectId);
    return res.status(200).json({
      success: true,
      data: extensions,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch project extensions',
    });
  }
};

export const getMyExtensionRequests = async (req, res) => {
  try {
    const extensions = await extensionService.getMyExtensionRequests(req.user);
    return res.status(200).json({
      success: true,
      data: extensions,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch extension requests',
    });
  }
};
