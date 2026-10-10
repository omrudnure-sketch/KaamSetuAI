import {
  createHiringAgreement,
  getHiringAgreement,
  getWorkerHiringAgreements,
  getEmployerHiringAgreements,
  acceptHiringAgreement,
  rejectHiringAgreement,
  counterOffer,
  cancelHiringAgreement,
} from '../services/hiringService.js';
import { validateCreateHiringAgreement, validateCounterOffer } from '../validators/hiringValidator.js';

export const handleCreateHiringAgreement = async (req, res, next) => {
  try {
    const validation = validateCreateHiringAgreement(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const agreement = await createHiringAgreement(req.user, validation.data);
    res.status(201).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetHiringAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await getHiringAgreement(req.user.id, id);
    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkerHiringAgreements = async (req, res, next) => {
  try {
    const agreements = await getWorkerHiringAgreements(req.user.id);
    res.status(200).json({
      success: true,
      data: agreements,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetEmployerHiringAgreements = async (req, res, next) => {
  try {
    const agreements = await getEmployerHiringAgreements(req.user.id);
    res.status(200).json({
      success: true,
      data: agreements,
    });
  } catch (error) {
    next(error);
  }
};

export const handleAcceptHiringAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await acceptHiringAgreement(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRejectHiringAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await rejectHiringAgreement(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};

export const handleCounterOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validation = validateCounterOffer(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.error },
      });
    }

    const agreement = await counterOffer(req.user.id, req.user.role, id, validation.data);
    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};

export const handleCancelHiringAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await cancelHiringAgreement(req.user.id, req.user.role, id);
    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    next(error);
  }
};
