import { Project, ProjectWorker, Review, WorkerProfile, EmployerProfile } from '../models/index.js';

export const createReview = async (user, projectId, inputData) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (!['completed', 'closed'].includes(project.status)) {
    const error = new Error(`Projects can only be reviewed after completion (current status: ${project.status})`);
    error.statusCode = 400;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const projectWorker = await ProjectWorker.findOne({ projectId, workerId: user.id });
  const isWorker = !!projectWorker;

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized: Only project participants can submit reviews');
    error.statusCode = 403;
    throw error;
  }

  let reviewerRole = '';
  let revieweeRole = '';

  if (isEmployer) {
    reviewerRole = 'employer';
    revieweeRole = 'worker';
    // Verify target reviewee is a worker in this project
    const validWorker = await ProjectWorker.exists({ projectId, workerId: inputData.revieweeId });
    if (!validWorker) {
      const error = new Error('Selected reviewee is not a worker on this project');
      error.statusCode = 400;
      throw error;
    }
  } else {
    reviewerRole = 'worker';
    revieweeRole = 'employer';
    // Verify target reviewee is the employer of this project
    if (project.employerId.toString() !== inputData.revieweeId) {
      const error = new Error('Selected reviewee is not the employer of this project');
      error.statusCode = 400;
      throw error;
    }
  }

  // Prevent duplicate review per project participant pair
  const existingReview = await Review.findOne({
    projectId,
    reviewerId: user.id,
    revieweeId: inputData.revieweeId,
  });

  if (existingReview) {
    const error = new Error('You have already submitted a review for this participant on this project');
    error.statusCode = 409;
    throw error;
  }

  const review = new Review({
    projectId,
    reviewerId: user.id,
    revieweeId: inputData.revieweeId,
    reviewerRole,
    revieweeRole,
    rating: inputData.rating,
    comment: inputData.comment || '',
    status: 'published',
  });

  await review.save();

  // Recalculate average rating and total reviews for reviewee
  const publishedReviews = await Review.find({
    revieweeId: inputData.revieweeId,
    status: 'published',
  });

  const totalReviews = publishedReviews.length;
  const sumRating = publishedReviews.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

  if (revieweeRole === 'worker') {
    await WorkerProfile.findOneAndUpdate(
      { userId: inputData.revieweeId },
      { rating: avgRating, totalReviews }
    );
  } else if (revieweeRole === 'employer') {
    await EmployerProfile.findOneAndUpdate(
      { userId: inputData.revieweeId },
      { rating: avgRating, totalReviews }
    );
  }

  return await review.populate(['projectId', 'reviewerId', 'revieweeId']);
};

export const getProjectReviews = async (user, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const isWorker = await ProjectWorker.exists({ projectId, workerId: user.id });

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to view reviews for this project');
    error.statusCode = 403;
    throw error;
  }

  return await Review.find({ projectId, status: 'published' })
    .sort({ createdAt: -1 })
    .populate(['reviewerId', 'revieweeId']);
};

export const getWorkerReviews = async (workerId) => {
  return await Review.find({ revieweeId: workerId, revieweeRole: 'worker', status: 'published' })
    .sort({ createdAt: -1 })
    .populate(['reviewerId', 'projectId']);
};

export const getEmployerReviews = async (employerId) => {
  return await Review.find({ revieweeId: employerId, revieweeRole: 'employer', status: 'published' })
    .sort({ createdAt: -1 })
    .populate(['reviewerId', 'projectId']);
};

export const getMyReviews = async (user) => {
  const given = await Review.find({ reviewerId: user.id, status: 'published' })
    .sort({ createdAt: -1 })
    .populate(['revieweeId', 'projectId']);

  const received = await Review.find({ revieweeId: user.id, status: 'published' })
    .sort({ createdAt: -1 })
    .populate(['reviewerId', 'projectId']);

  return { given, received };
};
