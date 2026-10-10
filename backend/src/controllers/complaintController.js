import * as complaintService from '../services/complaintService.js';
import { validateComplaintInput } from '../validators/complaintValidator.js';

export const createComplaint = async (req, res) => {
  try {
    const validation = validateComplaintInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const complaint = await complaintService.createComplaint(req.user, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit complaint',
    });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await complaintService.getMyComplaints(req.user);
    return res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch complaints',
    });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await complaintService.getComplaint(req.user, id);
    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch complaint details',
    });
  }
};

export const cancelComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await complaintService.cancelComplaint(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Complaint cancelled successfully',
      data: complaint,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to cancel complaint',
    });
  }
};
