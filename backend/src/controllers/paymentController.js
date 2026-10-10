import * as paymentService from '../services/paymentService.js';
import { validatePaymentInput } from '../validators/paymentValidator.js';

export const recordPayment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const validation = validatePaymentInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const payment = await paymentService.recordPayment(req.user, projectId, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to record payment',
    });
  }
};

export const getProjectPayments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const payments = await paymentService.getProjectPayments(req.user, projectId);
    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch project payments',
    });
  }
};

export const getWorkerPayments = async (req, res) => {
  try {
    const payments = await paymentService.getWorkerPayments(req.user);
    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch worker payments',
    });
  }
};

export const getEmployerPayments = async (req, res) => {
  try {
    const payments = await paymentService.getEmployerPayments(req.user);
    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch employer payments',
    });
  }
};

export const getWorkerEarningsSummary = async (req, res) => {
  try {
    const summary = await paymentService.getWorkerEarningsSummary(req.user);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch earnings summary',
    });
  }
};
