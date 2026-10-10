import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { WorkerPage } from '../pages/WorkerPage.jsx';
import { EmployerPage } from '../pages/EmployerPage.jsx';
import { AdminPage } from '../pages/AdminPage.jsx';
import { Login } from '../pages/Login.jsx';
import { Register } from '../pages/Register.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

import { WorkerProfilePage } from '../pages/WorkerProfilePage.jsx';
import { EmployerProfilePage } from '../pages/EmployerProfilePage.jsx';

import { EmployerJobsPage } from '../pages/EmployerJobsPage.jsx';
import { CreateJobPage } from '../pages/CreateJobPage.jsx';
import { EmployerJobDetailPage } from '../pages/EmployerJobDetailPage.jsx';
import { EmployerJobApplicationsPage } from '../pages/EmployerJobApplicationsPage.jsx';
import { EmployerInvitationsPage } from '../pages/EmployerInvitationsPage.jsx';
import { EmployerHiringListPage } from '../pages/EmployerHiringListPage.jsx';
import { EmployerHiringDetailPage } from '../pages/EmployerHiringDetailPage.jsx';
import { EmployerProjectsListPage } from '../pages/EmployerProjectsListPage.jsx';
import { EmployerProjectDetailPage } from '../pages/EmployerProjectDetailPage.jsx';
import EmployerPaymentsPage from '../pages/EmployerPaymentsPage.jsx';
import EmployerMessagesPage from '../pages/EmployerMessagesPage.jsx';
import EmployerNotificationsPage from '../pages/EmployerNotificationsPage.jsx';
import EmployerComplaintsPage from '../pages/EmployerComplaintsPage.jsx';
import EmployerDisputesPage from '../pages/EmployerDisputesPage.jsx';
import { EmployerWorkerMapPage } from '../pages/EmployerWorkerMapPage.jsx';
import { EmployerWorkersPage } from '../pages/EmployerWorkersPage.jsx';

import { WorkerJobsPage } from '../pages/WorkerJobsPage.jsx';
import { WorkerJobDetailPage } from '../pages/WorkerJobDetailPage.jsx';
import { WorkerJobMapPage } from '../pages/WorkerJobMapPage.jsx';
import { WorkerApplicationsPage } from '../pages/WorkerApplicationsPage.jsx';
import { WorkerInvitationsPage } from '../pages/WorkerInvitationsPage.jsx';
import { WorkerHiringListPage } from '../pages/WorkerHiringListPage.jsx';
import { WorkerHiringDetailPage } from '../pages/WorkerHiringDetailPage.jsx';
import { WorkerProjectsListPage } from '../pages/WorkerProjectsListPage.jsx';
import { WorkerProjectDetailPage } from '../pages/WorkerProjectDetailPage.jsx';
import WorkerEarningsPage from '../pages/WorkerEarningsPage.jsx';
import WorkerMessagesPage from '../pages/WorkerMessagesPage.jsx';
import WorkerNotificationsPage from '../pages/WorkerNotificationsPage.jsx';
import WorkerComplaintsPage from '../pages/WorkerComplaintsPage.jsx';
import WorkerDisputesPage from '../pages/WorkerDisputesPage.jsx';

import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { AdminUsersPage } from '../pages/AdminUsersPage.jsx';
import { AdminComplaintsPage } from '../pages/AdminComplaintsPage.jsx';
import { AdminDisputesPage } from '../pages/AdminDisputesPage.jsx';
import { AdminAuditLogsPage } from '../pages/AdminAuditLogsPage.jsx';
import { AdminVerificationsPage } from '../pages/AdminVerificationsPage.jsx';
import { AdminProjectsPage } from '../pages/AdminProjectsPage.jsx';
import { AdminAnalyticsPage } from '../pages/AdminAnalyticsPage.jsx';
import { AdminReportsPage } from '../pages/AdminReportsPage.jsx';
import { AdminMapPage } from '../pages/AdminMapPage.jsx';
import { AdminSettingsPage } from '../pages/AdminSettingsPage.jsx';
import { AdminAiAssistantPage } from '../pages/AdminAiAssistantPage.jsx';
import { AdminFraudRiskPage } from '../pages/AdminFraudRiskPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Protected Admin Routes with AdminLayout */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          <Route path="dashboard" element={<AdminPage />} />
          <Route path="ai-assistant" element={<AdminAiAssistantPage />} />
          <Route path="fraud-risk" element={<AdminFraudRiskPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="workers" element={<AdminUsersPage />} />
          <Route path="employers" element={<AdminUsersPage />} />
          <Route path="verifications" element={<AdminVerificationsPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
          <Route path="disputes" element={<AdminDisputesPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="map" element={<AdminMapPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* Main Public & Portal Routes */}
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<HomePage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Protected Worker Routes */}
        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route path="worker" element={<WorkerPage />} />
          <Route path="worker/profile" element={<WorkerProfilePage />} />
          <Route path="worker/jobs" element={<WorkerJobsPage />} />
          <Route path="worker/jobs/map" element={<WorkerJobMapPage />} />
          <Route path="worker/jobs/:id" element={<WorkerJobDetailPage />} />
          <Route path="worker/applications" element={<WorkerApplicationsPage />} />
          <Route path="worker/invitations" element={<WorkerInvitationsPage />} />
          <Route path="worker/hiring" element={<WorkerHiringListPage />} />
          <Route path="worker/hiring/:id" element={<WorkerHiringDetailPage />} />
          <Route path="worker/projects" element={<WorkerProjectsListPage />} />
          <Route path="worker/projects/:id" element={<WorkerProjectDetailPage />} />
          <Route path="worker/earnings" element={<WorkerEarningsPage />} />
          <Route path="worker/messages" element={<WorkerMessagesPage />} />
          <Route path="worker/messages/:conversationId" element={<WorkerMessagesPage />} />
          <Route path="worker/notifications" element={<WorkerNotificationsPage />} />
          <Route path="worker/help" element={<WorkerComplaintsPage />} />
          <Route path="worker/complaints" element={<WorkerComplaintsPage />} />
          <Route path="worker/complaints/:id" element={<WorkerComplaintsPage />} />
          <Route path="worker/disputes" element={<WorkerDisputesPage />} />
          <Route path="worker/disputes/:id" element={<WorkerDisputesPage />} />
        </Route>

        {/* Protected Employer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['employer']} />}>
          <Route path="employer" element={<EmployerPage />} />
          <Route path="employer/profile" element={<EmployerProfilePage />} />
          <Route path="employer/jobs" element={<EmployerJobsPage />} />
          <Route path="employer/jobs/create" element={<CreateJobPage />} />
          <Route path="employer/jobs/:id" element={<EmployerJobDetailPage />} />
          <Route path="employer/jobs/:id/edit" element={<CreateJobPage />} />
          <Route path="employer/jobs/:id/applications" element={<EmployerJobApplicationsPage />} />
          <Route path="employer/workers" element={<EmployerWorkersPage />} />
          <Route path="employer/workers/map" element={<EmployerWorkerMapPage />} />
          <Route path="employer/applications" element={<EmployerJobApplicationsPage />} />
          <Route path="employer/invitations" element={<EmployerInvitationsPage />} />
          <Route path="employer/hiring" element={<EmployerHiringListPage />} />
          <Route path="employer/hiring/:id" element={<EmployerHiringDetailPage />} />
          <Route path="employer/projects" element={<EmployerProjectsListPage />} />
          <Route path="employer/projects/:id" element={<EmployerProjectDetailPage />} />
          <Route path="employer/payments" element={<EmployerPaymentsPage />} />
          <Route path="employer/messages" element={<EmployerMessagesPage />} />
          <Route path="employer/messages/:conversationId" element={<EmployerMessagesPage />} />
          <Route path="employer/notifications" element={<EmployerNotificationsPage />} />
          <Route path="employer/help" element={<EmployerComplaintsPage />} />
          <Route path="employer/complaints" element={<EmployerComplaintsPage />} />
          <Route path="employer/complaints/:id" element={<EmployerComplaintsPage />} />
          <Route path="employer/disputes" element={<EmployerDisputesPage />} />
          <Route path="employer/disputes/:id" element={<EmployerDisputesPage />} />
        </Route>

        {/* Catch-all Not Found Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
