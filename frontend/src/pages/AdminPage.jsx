import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardAnalytics, getFlaggedUsers } from '../services/adminService.js';

export const AdminPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resAnalytics, resFlagged] = await Promise.all([
          getDashboardAnalytics(),
          getFlaggedUsers().catch(() => ({ data: [] })),
        ]);
        if (resAnalytics?.data) setAnalytics(resAnalytics.data);
        if (resFlagged?.data) setFlaggedUsers(resFlagged.data);
      } catch (err) {
        console.error('Failed to load admin dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full space-y-space-md py-2">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary text-on-primary p-space-md shadow-md">
        <div className="flex items-start justify-between gap-space-sm relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-pulse" />
              <span className="font-label-sm text-xs uppercase tracking-wider text-primary-fixed">
                Governance Portal • प्रशासन
              </span>
            </div>
            <h1 className="font-headline-lg text-xl sm:text-2xl font-bold">Admin Platform Control</h1>
            <p className="font-body-sm text-xs text-primary-fixed mt-0.5">
              Monitor users, resolve site disputes, audit system logs & review fraud risk.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-lowest/15 backdrop-blur-md flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
          </div>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="font-label-sm text-xs text-on-surface-variant">Total Users</div>
          <div className="font-headline-md text-2xl font-bold text-primary mt-1">
            {loading ? '...' : analytics?.totalUsers || 0}
          </div>
          <div className="font-body-sm text-[11px] text-on-surface-variant mt-1">
            {analytics?.totalWorkers || 0} Workers • {analytics?.totalEmployers || 0} Employers
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="font-label-sm text-xs text-on-surface-variant">Active Projects</div>
          <div className="font-headline-md text-2xl font-bold text-tertiary-container mt-1">
            {loading ? '...' : analytics?.activeProjects || 0}
          </div>
          <div className="font-body-sm text-[11px] text-on-surface-variant mt-1">
            {analytics?.totalJobs || 0} Total Jobs
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="font-label-sm text-xs text-on-surface-variant">Open Disputes</div>
          <div className="font-headline-md text-2xl font-bold text-error mt-1">
            {loading ? '...' : analytics?.openDisputes || 0}
          </div>
          <div className="font-body-sm text-[11px] text-on-surface-variant mt-1">
            {analytics?.openComplaints || 0} Complaints
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="font-label-sm text-xs text-on-surface-variant">Escrow Processed</div>
          <div className="font-headline-md text-2xl font-bold text-secondary mt-1">
            ₹{loading ? '...' : (analytics?.totalEarnings || 0).toLocaleString()}
          </div>
          <div className="font-body-sm text-[11px] text-on-surface-variant mt-1">Verified Payouts</div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        <Link
          to="/admin/users"
          className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col items-center text-center hover:border-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-1">group</span>
          <span className="font-label-md text-xs font-bold text-on-surface">User Management</span>
        </Link>
        <Link
          to="/admin/complaints"
          className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col items-center text-center hover:border-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px] text-secondary mb-1">report_problem</span>
          <span className="font-label-md text-xs font-bold text-on-surface">Complaints</span>
        </Link>
        <Link
          to="/admin/disputes"
          className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col items-center text-center hover:border-error transition-colors"
        >
          <span className="material-symbols-outlined text-[24px] text-error mb-1">gavel</span>
          <span className="font-label-md text-xs font-bold text-on-surface">Dispute Resolution</span>
        </Link>
        <Link
          to="/admin/audit-logs"
          className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col items-center text-center hover:border-tertiary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px] text-tertiary-container mb-1">receipt_long</span>
          <span className="font-label-md text-xs font-bold text-on-surface">Audit Logs</span>
        </Link>
      </div>

      {/* Flagged Fraud Risk Alert Banner */}
      {flaggedUsers.length > 0 && (
        <div className="rounded-xl bg-error-container/40 border border-error/30 p-space-md space-y-2">
          <div className="flex items-center gap-2 text-error font-label-md text-xs font-bold">
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span>Security & Fraud Risk Alerts ({flaggedUsers.length})</span>
          </div>
          <div className="space-y-1.5">
            {flaggedUsers.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-surface-container-lowest p-2 rounded-lg">
                <span className="font-semibold text-on-surface">{f.userName} ({f.role})</span>
                <span className="px-2 py-0.5 rounded bg-error text-on-error font-bold text-[10px]">
                  Risk Score: {f.riskScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
