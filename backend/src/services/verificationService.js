import { VerificationRecord, User, WorkerProfile, EmployerProfile } from '../models/index.js';
import { createAuditLog } from './auditService.js';

export const getVerificationQueue = async ({ status = 'pending', verificationType, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (verificationType) filter.verificationType = verificationType;

  const skip = (Number(page) - 1) * Number(limit);
  const [records, total] = await Promise.all([
    VerificationRecord.find(filter)
      .populate('userId', 'name phone email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VerificationRecord.countDocuments(filter),
  ]);

  return { records, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};

export const createVerificationRecord = async ({ userId, verificationType, documents }) => {
  const record = await VerificationRecord.create({
    userId,
    verificationType,
    documents: documents || [{ docType: 'Aadhaar / ID', docUrl: 'https://placeholder.docs/id_scan.png' }],
    status: 'pending',
  });
  return record;
};

export const reviewVerificationRecord = async (recordId, { status, rejectionReason, notes }, adminId, req) => {
  const record = await VerificationRecord.findById(recordId);
  if (!record) {
    const error = new Error('Verification record not found');
    error.status = 404;
    throw error;
  }

  const oldStatus = record.status;
  record.status = status;
  record.reviewedBy = adminId;
  record.reviewedAt = new Date();
  if (rejectionReason) record.rejectionReason = rejectionReason;
  if (notes) record.notes = notes;
  await record.save();

  // Update user / profile verification status if verified
  if (status === 'verified') {
    await User.findByIdAndUpdate(record.userId, { isVerified: true });
    const user = await User.findById(record.userId);
    if (user?.role === 'worker') {
      await WorkerProfile.findOneAndUpdate({ userId: record.userId }, { isVerified: true });
    } else if (user?.role === 'employer') {
      await EmployerProfile.findOneAndUpdate({ userId: record.userId }, { isVerified: true });
    }
  }

  // Audit Log
  await createAuditLog({
    adminId,
    action: status === 'verified' ? 'WORKER_VERIFIED' : 'VERIFICATION_REJECTED',
    resourceType: 'VerificationRecord',
    resourceId: record._id,
    oldValue: oldStatus,
    newValue: status,
    reason: rejectionReason || notes || 'Admin review decision',
    req,
  });

  return record;
};
