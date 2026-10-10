import * as reviewService from '../services/reviewService.js';
import { validateReviewInput } from '../validators/reviewValidator.js';

export const createReview = async (req, res) => {
  try {
    const { projectId } = req.params;
    const validation = validateReviewInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const review = await reviewService.createReview(req.user, projectId, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit review',
    });
  }
};

export const getProjectReviews = async (req, res) => {
  try {
    const { projectId } = req.params;
    const reviews = await reviewService.getProjectReviews(req.user, projectId);
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch project reviews',
    });
  }
};

export const getWorkerReviews = async (req, res) => {
  try {
    const { workerId } = req.params;
    const reviews = await reviewService.getWorkerReviews(workerId);
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch worker reviews',
    });
  }
};

export const getEmployerReviews = async (req, res) => {
  try {
    const { employerId } = req.params;
    const reviews = await reviewService.getEmployerReviews(employerId);
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch employer reviews',
    });
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getMyReviews(req.user);
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch your reviews',
    });
  }
};
