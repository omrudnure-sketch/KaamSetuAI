import * as disputeService from '../services/disputeService.js';
import { validateDisputeInput } from '../validators/disputeValidator.js';

export const createDispute = async (req, res) => {
  try {
    const validation = validateDisputeInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const dispute = await disputeService.createDispute(req.user, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Dispute filed successfully',
      data: dispute,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to file dispute',
    });
  }
};

export const getMyDisputes = async (req, res) => {
  try {
    const disputes = await disputeService.getMyDisputes(req.user);
    return res.status(200).json({
      success: true,
      data: disputes,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch disputes',
    });
  }
};

export const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await disputeService.getDispute(req.user, id);
    return res.status(200).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch dispute details',
    });
  }
};

export const cancelDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await disputeService.cancelDispute(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Dispute cancelled successfully',
      data: dispute,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to cancel dispute',
    });
  }
};
