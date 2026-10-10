import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  Project,
  Payment,
  Complaint,
  Dispute,
  AuditLog,
} from '../models/index.js';

export const getDashboardAnalytics = async () => {
  const [
    totalUsers,
    totalWorkers,
    totalEmployers,
    totalJobs,
    activeProjects,
    paymentsResult,
    openComplaints,
    openDisputes,
  ] = await Promise.all([
    User.countDocuments(),
    WorkerProfile.countDocuments(),
    EmployerProfile.countDocuments(),
    Job.countDocuments(),
    Project.countDocuments({ status: { $in: ['in_progress', 'created'] } }),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]),
    Complaint.countDocuments({ status: { $in: ['new', 'under_review', 'investigating'] } }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'investigating'] } }),
  ]);

  const totalEarnings = paymentsResult[0]?.totalAmount || 0;

  return {
    totalUsers,
    totalWorkers,
    totalEmployers,
    totalJobs,
    activeProjects,
    totalEarnings,
    openComplaints,
    openDisputes,
  };
};

export const getUsersList = async ({ role, status, search, page = 1, limit = 20 }) => {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  };
};

export const updateUserStatus = async (userId, { status, reason }, adminId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const oldStatus = user.status || 'active';
  user.status = status;
  await user.save();

  // Record Audit Log
  await AuditLog.create({
    adminId,
    action: `USER_STATUS_CHANGE_${status.toUpperCase()}`,
    targetType: 'User',
    targetId: user._id,
    details: {
      oldStatus,
      newStatus: status,
      reason: reason || 'Admin action',
    },
  });

  return user;
};

export const getAllComplaints = async ({ status, priority, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (Number(page) - 1) * Number(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('reporterId', 'name phone role')
      .populate('targetUserId', 'name phone role')
      .populate('projectId', 'title')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Complaint.countDocuments(filter),
  ]);

  return { complaints, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};

export const resolveComplaint = async (complaintId, { resolution, status = 'resolved' }, adminId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    const error = new Error('Complaint not found');
    error.status = 404;
    throw error;
  }

  complaint.status = status;
  complaint.resolution = resolution;
  complaint.assignedAdminId = adminId;
  complaint.resolvedAt = new Date();
  await complaint.save();

  await AuditLog.create({
    adminId,
    action: `COMPLAINT_RESOLVED`,
    targetType: 'Complaint',
    targetId: complaint._id,
    details: { resolution, status },
  });

  return complaint;
};

export const getAllDisputes = async ({ status, type, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (Number(page) - 1) * Number(limit);
  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .populate('initiatedBy', 'name phone role')
      .populate('againstUserId', 'name phone role')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Dispute.countDocuments(filter),
  ]);

  return { disputes, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};

export const resolveDispute = async (disputeId, { resolution, status = 'resolved' }, adminId) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    const error = new Error('Dispute not found');
    error.status = 404;
    throw error;
  }

  dispute.status = status;
  dispute.resolution = resolution;
  dispute.resolvedBy = adminId;
  dispute.resolvedAt = new Date();
  await dispute.save();

  await AuditLog.create({
    adminId,
    action: `DISPUTE_RESOLVED`,
    targetType: 'Dispute',
    targetId: dispute._id,
    details: { resolution, status },
  });

  return dispute;
};

export const getAuditLogs = async ({ page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find()
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(),
  ]);

  return { logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};
