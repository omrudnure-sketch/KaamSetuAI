import { Project, ProjectWorker, Payment, Attendance } from '../models/index.js';

export const recordPayment = async (user, projectId, inputData) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const employerId = (project.employerId?._id || project.employerId?.id || project.employerId)?.toString();
  const userId = (user.id || user._id)?.toString();

  if (employerId !== userId) {
    const error = new Error('Only the project employer can record payments');
    error.statusCode = 403;
    throw error;
  }

  const projectWorker = await ProjectWorker.findOne({
    _id: inputData.projectWorkerId,
    projectId,
  });

  if (!projectWorker) {
    const error = new Error('Project worker assignment not found in this project');
    error.statusCode = 404;
    throw error;
  }

  const payment = new Payment({
    projectId,
    projectWorkerId: projectWorker._id,
    workerId: projectWorker.workerId,
    employerId: employerId,
    type: inputData.type,
    amount: inputData.amount,
    paymentDate: inputData.paymentDate ? new Date(inputData.paymentDate) : new Date(),
    status: inputData.status || 'recorded',
    method: inputData.method || 'cash',
    reference: inputData.reference || '',
    notes: inputData.notes || '',
    createdBy: userId,
  });

  await payment.save();
  return await payment.populate(['projectId', 'projectWorkerId', 'workerId', 'employerId']);
};

export const getProjectPayments = async (user, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const employerId = (project.employerId?._id || project.employerId?.id || project.employerId)?.toString();
  const userId = (user.id || user._id)?.toString();
  const isEmployer = employerId === userId;
  const isWorker = await ProjectWorker.exists({ projectId, workerId: userId });

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to view payments for this project');
    error.statusCode = 403;
    throw error;
  }

  let query = { projectId };
  // If user is a worker, limit payment records to their own
  if (!isEmployer && isWorker) {
    query.workerId = user.id;
  }

  return await Payment.find(query)
    .sort({ paymentDate: -1, createdAt: -1 })
    .populate(['workerId', 'employerId', 'projectWorkerId']);
};

export const getWorkerPayments = async (user) => {
  return await Payment.find({ workerId: user.id })
    .sort({ paymentDate: -1, createdAt: -1 })
    .populate(['projectId', 'employerId', 'projectWorkerId']);
};

export const getEmployerPayments = async (user) => {
  return await Payment.find({ employerId: user.id })
    .sort({ paymentDate: -1, createdAt: -1 })
    .populate(['projectId', 'workerId', 'projectWorkerId']);
};

export const getWorkerEarningsSummary = async (user) => {
  const payments = await Payment.find({ workerId: user.id });

  let totalEarnings = 0;
  let pending = 0;
  let disputed = 0;
  let thisMonth = 0;
  let thisWeek = 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  payments.forEach((p) => {
    if (p.status === 'recorded') {
      totalEarnings += p.amount;
      const pDate = new Date(p.paymentDate);
      if (pDate >= startOfMonth) thisMonth += p.amount;
      if (pDate >= startOfWeek) thisWeek += p.amount;
    } else if (p.status === 'pending') {
      pending += p.amount;
    } else if (p.status === 'disputed') {
      disputed += p.amount;
    }
  });

  // Calculate expected earnings across projects based on attendance & agreed wage
  const projectWorkers = await ProjectWorker.find({ workerId: user.id });
  let totalExpected = 0;

  for (const pw of projectWorkers) {
    const presentCount = await Attendance.countDocuments({
      projectWorkerId: pw._id,
      status: 'present',
    });
    const expectedForPW = presentCount * (pw.agreedWage || 0);
    totalExpected += expectedForPW;
  }

  // Derived pending if expected > recorded
  const derivedPending = Math.max(pending, totalExpected - totalEarnings);

  return {
    totalEarnings,
    thisMonth,
    thisWeek,
    pending: derivedPending,
    paid: totalEarnings,
    disputed,
    totalExpected,
  };
};
