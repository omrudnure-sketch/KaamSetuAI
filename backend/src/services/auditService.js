import { AuditLog } from '../models/index.js';

export const createAuditLog = async ({
  adminId,
  action,
  resourceType,
  resourceId,
  oldValue = null,
  newValue = null,
  reason = '',
  req = null,
}) => {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    const log = await AuditLog.create({
      adminId,
      action,
      targetType: resourceType,
      targetId: resourceId,
      details: {
        oldValue,
        newValue,
        reason,
        userAgent,
      },
      ipAddress,
    });

    return log;
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error.message);
  }
};

export const getAuditLogs = async ({ resourceType, action, adminId, page = 1, limit = 20 }) => {
  const filter = {};
  if (resourceType) filter.targetType = resourceType;
  if (action) filter.action = action;
  if (adminId) filter.adminId = adminId;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};
