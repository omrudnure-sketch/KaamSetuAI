import { Router } from 'express';
import healthRoutes from './health.routes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import workerRoutes from './workerRoutes.js';
import employerRoutes from './employerRoutes.js';
import jobRoutes from './jobRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import invitationRoutes from './invitationRoutes.js';
import hiringRoutes from './hiringRoutes.js';
import projectRoutes from './projectRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import progressRoutes from './progressRoutes.js';
import extensionRoutes from './extensionRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import chatRoutes from './chatRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import disputeRoutes from './disputeRoutes.js';
import adminRoutes from './adminRoutes.js';
import aiRoutes from './aiRoutes.js';
import fraudRoutes from './fraudRoutes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/workers', workerRoutes);
router.use('/employers', employerRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/invitations', invitationRoutes);
router.use('/hiring-agreements', hiringRoutes);
router.use('/hiring', hiringRoutes);
router.use('/projects', projectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/progress', progressRoutes);

router.use('/', extensionRoutes);
router.use('/', paymentRoutes);
router.use('/', reviewRoutes);
router.use('/', chatRoutes);
router.use('/', notificationRoutes);
router.use('/', complaintRoutes);
router.use('/', disputeRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/fraud', fraudRoutes);

export default router;

