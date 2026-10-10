import * as verificationService from '../services/verificationService.js';

export const getVerificationQueue = async (req, res, next) => {
  try {
    const queue = await verificationService.getVerificationQueue(req.query);
    res.json({ success: true, data: queue });
  } catch (error) {
    next(error);
  }
};

export const createVerificationRecord = async (req, res, next) => {
  try {
    const record = await verificationService.createVerificationRecord(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const reviewVerificationRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await verificationService.reviewVerificationRecord(id, req.body, req.user.id, req);
    res.json({ success: true, data: record, message: `Verification status updated to ${record.status}` });
  } catch (error) {
    next(error);
  }
};
