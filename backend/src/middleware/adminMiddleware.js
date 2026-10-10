// Admin RBAC & Permission Middleware

export const ADMIN_ROLE_PERMISSIONS = {
  super_admin: ['*'],
  operations_admin: [
    'users.read',
    'users.update',
    'users.suspend',
    'workers.read',
    'workers.verify',
    'workers.suspend',
    'employers.read',
    'employers.verify',
    'employers.suspend',
    'jobs.read',
    'jobs.update',
    'jobs.remove',
    'projects.read',
    'projects.update',
    'attendance.read',
    'payments.read',
    'reviews.read',
    'reviews.moderate',
    'complaints.read',
    'complaints.manage',
    'disputes.read',
    'disputes.manage',
    'risk.read',
    'risk.manage',
    'analytics.read',
    'reports.generate',
    'audit.read',
  ],
  verification_admin: [
    'users.read',
    'workers.read',
    'workers.verify',
    'employers.read',
    'employers.verify',
  ],
  finance_admin: [
    'payments.read',
    'payments.update',
    'analytics.read',
    'reports.generate',
  ],
  support_admin: [
    'users.read',
    'complaints.read',
    'complaints.manage',
    'disputes.read',
    'disputes.manage',
    'reviews.read',
    'reviews.moderate',
    'risk.read',
    'risk.manage',
  ],
  analytics_admin: [
    'analytics.read',
    'reports.generate',
    'audit.read',
    'risk.read',
  ],
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: Admin access required' },
    });
  }
  next();
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Admin access required' },
      });
    }

    const adminRole = req.user.adminRole || 'super_admin';
    const userPermissions = req.user.permissions || ADMIN_ROLE_PERMISSIONS[adminRole] || ADMIN_ROLE_PERMISSIONS.super_admin;

    if (userPermissions.includes('*') || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { message: `Forbidden: Missing required permission [${permission}]` },
    });
  };
};
