import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin, requirePermission } from '../middleware/adminMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as adminDashboardController from '../controllers/adminDashboardController.js';
import * as verificationController from '../controllers/verificationController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as reportController from '../controllers/reportController.js';
import * as mapController from '../controllers/mapController.js';
import * as adminAssistantController from '../controllers/adminAssistantController.js';
import * as riskFlagController from '../controllers/riskFlagController.js';
import * as adminMonitoringController from '../controllers/adminMonitoringController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// Dashboard & Delayed Projects
router.get('/dashboard/overview', adminDashboardController.getDashboardOverview);
router.get('/projects/delayed', requirePermission('projects.read'), adminDashboardController.getDelayedProjects);

// User Governance
router.get('/analytics', requirePermission('analytics.read'), adminController.getDashboardAnalytics);
router.get('/users', requirePermission('users.read'), adminController.getUsersList);
router.patch('/users/:id/status', requirePermission('users.suspend'), adminController.updateUserStatus);

// Verification Queue & Review
router.get('/verifications', requirePermission('workers.verify'), verificationController.getVerificationQueue);
router.post('/verifications', verificationController.createVerificationRecord);
router.patch('/verifications/:id/review', requirePermission('workers.verify'), verificationController.reviewVerificationRecord);

// Complaints & Disputes
router.get('/complaints', requirePermission('complaints.read'), adminController.getAllComplaints);
router.patch('/complaints/:id/resolve', requirePermission('complaints.manage'), adminController.resolveComplaint);
router.get('/disputes', requirePermission('disputes.read'), adminController.getAllDisputes);
router.patch('/disputes/:id/resolve', requirePermission('disputes.manage'), adminController.resolveDispute);

// Analytics Engine APIs
router.get('/analytics/overview', requirePermission('analytics.read'), analyticsController.getOverview);
router.get('/analytics/users', requirePermission('analytics.read'), analyticsController.getUsers);
router.get('/analytics/hiring', requirePermission('analytics.read'), analyticsController.getHiring);
router.get('/analytics/projects', requirePermission('analytics.read'), analyticsController.getProjects);
router.get('/analytics/attendance', requirePermission('analytics.read'), analyticsController.getAttendance);
router.get('/analytics/payments', requirePermission('analytics.read'), analyticsController.getPayments);
router.get('/analytics/skills', requirePermission('analytics.read'), analyticsController.getSkills);
router.get('/analytics/locations', requirePermission('analytics.read'), analyticsController.getLocations);

// Comprehensive Platform Monitoring Routes (Workers, Employers, Projects, Activity)
router.get('/workers/directory', requirePermission('users.read'), adminMonitoringController.getWorkerDirectory);
router.get('/workers/:id/details', requirePermission('users.read'), adminMonitoringController.getWorkerDetails);
router.get('/employers/directory', requirePermission('users.read'), adminMonitoringController.getEmployerDirectory);
router.get('/employers/:id/details', requirePermission('users.read'), adminMonitoringController.getEmployerDetails);
router.get('/projects/monitoring', requirePermission('projects.read'), adminMonitoringController.getProjectMonitoringList);
router.get('/projects/:id/monitoring', requirePermission('projects.read'), adminMonitoringController.getProjectMonitoringDetails);
router.get('/monitoring/overview', requirePermission('analytics.read'), adminMonitoringController.getAdminMonitoringOverview);
router.get('/monitoring/activity-feed', requirePermission('analytics.read'), adminMonitoringController.getAdminLiveActivityFeed);
router.get('/monitoring/search', requirePermission('users.read'), adminMonitoringController.getAdminGlobalSearch);

// Geographic Analytics & Platform Intelligence APIs (Step 20 & Admin Monitoring)
router.get('/map/entities', requirePermission('analytics.read'), mapController.getAdminGeoEntities);
router.get('/analytics/geo-entities', requirePermission('analytics.read'), mapController.getAdminGeoEntities);
router.get('/analytics/geo-supply', requirePermission('analytics.read'), mapController.getAdminGeoSupply);
router.get('/analytics/geo-demand', requirePermission('analytics.read'), mapController.getAdminGeoDemand);
router.get('/analytics/geo-gaps', requirePermission('analytics.read'), mapController.getAdminGeoGaps);

// Reports & CSV Exports
router.get('/reports/:type', requirePermission('reports.generate'), reportController.getReport);

// Audit Logs
router.get('/audit-logs', requirePermission('audit.read'), adminController.getAuditLogs);

// Step 26: Admin AI Analytics Assistant
router.post(
  '/ai-assistant/query',
  requirePermission('analytics.read'),
  adminAssistantController.handleAdminQuery
);
router.get(
  '/ai-assistant/history',
  requirePermission('analytics.read'),
  adminAssistantController.handleGetHistory
);

// Step 27: Fraud and Risk Detection APIs
router.get(
  '/risk-flags',
  requirePermission('risk.read'),
  riskFlagController.getRiskFlags
);
router.get(
  '/risk-flags/stats',
  requirePermission('risk.read'),
  riskFlagController.getRiskStats
);
router.get(
  '/risk-flags/:id',
  requirePermission('risk.read'),
  riskFlagController.getRiskFlagById
);
router.post(
  '/risk-flags/scan',
  requirePermission('risk.manage'),
  riskFlagController.scanRiskFlags
);
router.patch(
  '/risk-flags/:id/status',
  requirePermission('risk.manage'),
  riskFlagController.updateRiskFlagStatus
);
router.patch(
  '/risk-flags/:id/assign',
  requirePermission('risk.manage'),
  riskFlagController.assignAdmin
);
router.post(
  '/risk-flags/:id/notes',
  requirePermission('risk.manage'),
  riskFlagController.addReviewNote
);

export default router;
