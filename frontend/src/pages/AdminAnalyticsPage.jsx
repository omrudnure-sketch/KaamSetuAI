import React, { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../services/authApi.js';

export const AdminAnalyticsPage = () => {
  // Date range state
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, funnel, users, projects, payments, skills, attendance

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [hiringData, setHiringData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [skillData, setSkillData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        dateRange,
        ...(dateRange === 'custom' && customStart ? { startDate: customStart } : {}),
        ...(dateRange === 'custom' && customEnd ? { endDate: customEnd } : {}),
      };

      const [resOverview, resHiring, resUsers, resProjects, resPayments, resSkills, resAttendance] =
        await Promise.all([
          authApiClient.get('/admin/analytics/overview', { params }),
          authApiClient.get('/admin/analytics/hiring', { params }),
          authApiClient.get('/admin/analytics/users', { params }),
          authApiClient.get('/admin/analytics/projects', { params }),
          authApiClient.get('/admin/analytics/payments', { params }),
          authApiClient.get('/admin/analytics/skills', { params }),
          authApiClient.get('/admin/analytics/attendance', { params }),
        ]);

      setOverviewData(resOverview.data?.data || null);
      setHiringData(resHiring.data?.data || null);
      setUserData(resUsers.data?.data || null);
      setProjectData(resProjects.data?.data || null);
      setPaymentData(resPayments.data?.data || null);
      setSkillData(resSkills.data?.data || null);
      setAttendanceData(resAttendance.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch admin analytics:', err);
      setError('Failed to load analytics data from server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const metrics = overviewData?.metrics || {};

  return (
    <div className="w-full space-y-6 py-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Admin Analytics & Intelligence</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time platform lifecycle metrics, hiring conversion rates, and financial telemetry.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {['today', '7d', '30d', '90d', 'year', 'custom'].map((rangeKey) => {
            const labels = {
              today: 'Today',
              '7d': '7 Days',
              '30d': '30 Days',
              '90d': '90 Days',
              year: 'This Year',
              custom: 'Custom',
            };
            return (
              <button
                key={rangeKey}
                onClick={() => setDateRange(rangeKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === rangeKey
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {labels[rangeKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs">
          <label className="font-semibold text-on-surface">From:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg bg-surface-container-low p-1.5 border border-outline-variant/30 text-on-surface"
          />
          <label className="font-semibold text-on-surface ml-2">To:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg bg-surface-container-low p-1.5 border border-outline-variant/30 text-on-surface"
          />
          <button
            onClick={fetchAnalytics}
            className="ml-auto px-3 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs border-b border-outline-variant/20 scrollbar-none">
        {[
          { id: 'overview', label: 'KPI Overview' },
          { id: 'funnel', label: 'Hiring Funnel' },
          { id: 'users', label: 'User & Geo Trends' },
          { id: 'projects', label: 'Projects & Delays' },
          { id: 'skills', label: 'Skill Demand & Gap' },
          { id: 'payments', label: 'Payments & Wage Telemetry' },
          { id: 'attendance', label: 'Attendance' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Crunching platform database analytics...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnalytics} className="underline font-bold ml-4">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* TAB 1: OVERVIEW KPI GRID */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Banner KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {[
                  {
                    label: 'Total Workers',
                    val: metrics.totalWorkers ?? 0,
                    sub: `${metrics.activeWorkers ?? 0} active • ${metrics.verifiedWorkers ?? 0} verified`,
                    badge: 'Workers',
                    color: 'text-primary',
                  },
                  {
                    label: 'Total Employers',
                    val: metrics.totalEmployers ?? 0,
                    sub: `${metrics.activeEmployers ?? 0} active on platform`,
                    badge: 'Employers',
                    color: 'text-secondary',
                  },
                  {
                    label: 'Jobs in Period',
                    val: metrics.totalJobs ?? 0,
                    sub: `${metrics.openJobs ?? 0} currently open`,
                    badge: 'Demand',
                    color: 'text-amber-500',
                  },
                  {
                    label: 'Confirmed Hires',
                    val: metrics.hiringAgreementsConfirmed ?? 0,
                    sub: 'Agreements finalized',
                    badge: 'Conversions',
                    color: 'text-emerald-500',
                  },
                  {
                    label: 'Active Projects',
                    val: metrics.activeProjects ?? 0,
                    sub: `${metrics.completedProjects ?? 0} completed in period`,
                    badge: 'Projects',
                    color: 'text-blue-500',
                  },
                  {
                    label: 'Delayed Projects',
                    val: metrics.delayedProjects ?? 0,
                    sub: 'Past expected end date',
                    badge: metrics.delayedProjects > 0 ? 'Attention' : 'Healthy',
                    color: metrics.delayedProjects > 0 ? 'text-error font-black' : 'text-slate-500',
                  },
                  {
                    label: 'Completion Rate',
                    val: metrics.completionRate || '0%',
                    sub: 'Finished vs closed ratio',
                    badge: 'Quality',
                    color: 'text-emerald-600',
                  },
                  {
                    label: 'Pending Verification',
                    val: metrics.pendingVerification ?? 0,
                    sub: 'Worker & employer queues',
                    badge: 'KYC',
                    color: 'text-violet-500',
                  },
                  {
                    label: 'Open Complaints',
                    val: metrics.openComplaints ?? 0,
                    sub: 'Under administrative review',
                    badge: 'Support',
                    color: metrics.openComplaints > 0 ? 'text-amber-600' : 'text-slate-500',
                  },
                  {
                    label: 'Open Disputes',
                    val: metrics.openDisputes ?? 0,
                    sub: 'Formal arbitration cases',
                    badge: 'Arbitration',
                    color: metrics.openDisputes > 0 ? 'text-error' : 'text-slate-500',
                  },
                  {
                    label: 'Payments Recorded',
                    val: `₹${metrics.paymentsRecorded?.amount || 0}`,
                    sub: `${metrics.paymentsRecorded?.count || 0} direct wage payouts`,
                    badge: 'Direct Wage',
                    color: 'text-emerald-600 font-mono',
                  },
                  {
                    label: 'Pending Payments',
                    val: `₹${metrics.pendingPayments?.amount || 0}`,
                    sub: `${metrics.pendingPayments?.count || 0} awaiting confirmation`,
                    badge: 'Pending',
                    color: 'text-amber-600 font-mono',
                  },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {card.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-surface-container text-on-surface-variant">
                        {card.badge}
                      </span>
                    </div>
                    <div className={`text-2xl font-black mt-2 tracking-tight ${card.color}`}>
                      {card.val}
                    </div>
                    <div className="text-[11px] text-on-surface-variant/80 mt-1 font-medium">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Metric Definitions Card */}
              {overviewData?.metricDefinitions && (
                <div className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20 text-xs space-y-1.5">
                  <div className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Methodology & Server Definitions
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-on-surface-variant text-[11px]">
                    {Object.entries(overviewData.metricDefinitions).map(([key, def]) => (
                      <div key={key}>
                        <strong className="text-on-surface capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>{' '}
                        {def}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HIRING FUNNEL */}
          {activeTab === 'funnel' && hiringData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Funnel Visualisation */}
                <div className="lg:col-span-2 p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold uppercase text-on-surface tracking-wider">
                        Full Marketplace Conversion Funnel
                      </h2>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Registration → Verification → Job Creation → Selection → Confirmation → Completion
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      Hiring Rate: {hiringData.metrics?.hiringConversionRate}
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {hiringData.funnel?.map((stage, idx) => {
                      const maxVal = Math.max(...hiringData.funnel.map((s) => s.count), 1);
                      const widthPct = Math.max(8, Math.round((stage.count / maxVal) * 100));

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-on-surface flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-[10px] text-on-surface-variant font-bold">
                                {idx + 1}
                              </span>
                              {stage.stage}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-on-surface">{stage.count}</span>
                              {idx > 0 && (
                                <span className="text-[10px] text-on-surface-variant">
                                  Conv: <strong className="text-emerald-600">{stage.conversionRate}</strong> • Drop:{' '}
                                  <strong className="text-error">{stage.dropOffRate}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Funnel Stats */}
                <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase text-on-surface tracking-wider">Funnel Telemetry</h2>
                    <div className="mt-4 space-y-3.5">
                      <div className="p-3 bg-surface-container-low rounded-xl">
                        <div className="text-[11px] text-on-surface-variant font-medium">Average Time to Hire</div>
                        <div className="text-xl font-black text-primary mt-1">
                          {hiringData.metrics?.avgTimeToHire}
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">
                          Job creation to confirmed hiring agreement
                        </div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded-xl">
                        <div className="text-[11px] text-on-surface-variant font-medium">Job Cancellation Rate</div>
                        <div className="text-xl font-black text-amber-600 mt-1">
                          {hiringData.metrics?.jobCancellationRate}
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">
                          Cancelled jobs / total posted jobs
                        </div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded-xl">
                        <div className="text-[11px] text-on-surface-variant font-medium">Repeat Employers</div>
                        <div className="text-xl font-black text-emerald-600 mt-1">
                          {hiringData.metrics?.repeatHiringCount || 0}
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">
                          Employers with &gt;1 confirmed hire
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-on-surface-variant border-t border-outline-variant/20 pt-3">
                    <strong>Note:</strong> {hiringData.limitations}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS & GEOGRAPHY */}
          {activeTab === 'users' && userData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-xs font-bold text-on-surface-variant uppercase">Profile Completion</div>
                  <div className="text-xl font-black text-primary mt-2">
                    {userData.profileCompletion?.workerProfileRate} (Workers)
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Employers: {userData.profileCompletion?.employerProfileRate}
                  </div>
                </div>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-xs font-bold text-on-surface-variant uppercase">Worker Verification</div>
                  <div className="text-xl font-black text-emerald-600 mt-2">
                    {userData.verification?.workers?.verified} Verified
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    {userData.verification?.workers?.unverified} Pending / Unverified
                  </div>
                </div>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-xs font-bold text-on-surface-variant uppercase">Active Users Rule</div>
                  <div className="text-xl font-black text-blue-600 mt-2">
                    {userData.totals?.activeUsers} Active
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    {userData.totals?.activeDefinition}
                  </div>
                </div>
              </div>

              {/* Geographic Distribution Table */}
              <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase text-on-surface tracking-wider">
                  Top Cities - Geographic User Distribution
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-on-surface-variant">
                        <th className="py-2">City</th>
                        <th className="py-2">Registered Workers</th>
                        <th className="py-2">Registered Employers</th>
                        <th className="py-2">Total User Base</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-medium">
                      {userData.geographicDistribution?.map((g, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/50">
                          <td className="py-2 font-bold text-on-surface">{g.city}</td>
                          <td className="py-2 text-primary font-mono font-bold">{g.workers}</td>
                          <td className="py-2 text-secondary font-mono font-bold">{g.employers}</td>
                          <td className="py-2 font-mono font-bold">{g.workers + g.employers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROJECTS & DELAYS */}
          {activeTab === 'projects' && projectData && (
            <div className="space-y-6">
              {/* Delayed Projects Alert & Table */}
              <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase text-on-surface tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
                      Delayed Projects Audit ({projectData.delayedProjects?.count || 0})
                    </h2>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {projectData.delayedProjects?.definition}
                    </p>
                  </div>
                </div>

                {projectData.delayedProjects?.list?.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl font-medium">
                    No delayed projects detected! All active engagements are on or ahead of schedule.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/20 text-on-surface-variant font-bold">
                          <th className="py-2">Project Name</th>
                          <th className="py-2">Employer</th>
                          <th className="py-2">City</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Progress</th>
                          <th className="py-2">Expected End</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {projectData.delayedProjects?.list?.map((p) => (
                          <tr key={p.id} className="hover:bg-error/5">
                            <td className="py-2 font-bold text-on-surface">{p.name}</td>
                            <td className="py-2 text-on-surface-variant">{p.employer}</td>
                            <td className="py-2">{p.city}</td>
                            <td className="py-2">
                              <span className="px-2 py-0.5 bg-error/15 text-error rounded-md text-[10px] font-bold">
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2 font-mono font-bold">{p.progress}</td>
                            <td className="py-2 font-mono text-error font-bold">{p.expectedEnd}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Status and Velocity Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Average Progress</div>
                  <div className="text-xl font-black text-primary mt-1">
                    {projectData.metrics?.averageProgress}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Avg Duration</div>
                  <div className="text-xl font-black text-primary mt-1">
                    {projectData.metrics?.averageDurationDays}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Total Extensions</div>
                  <div className="text-xl font-black text-amber-600 mt-1">
                    {projectData.metrics?.totalExtensions}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Extensions / Project</div>
                  <div className="text-xl font-black text-on-surface mt-1">
                    {projectData.metrics?.extensionsPerProject}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SKILL DEMAND & SUPPLY GAP */}
          {activeTab === 'skills' && skillData && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold uppercase text-on-surface tracking-wider">
                      Skill Demand vs. Available Supply Gap Analysis
                    </h2>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Demand = Open Jobs • Supply = Available Workers • Gap = Unfilled Shortage
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-on-surface-variant font-bold">
                        <th className="py-2.5">Skill Category</th>
                        <th className="py-2.5">Open Jobs (Demand)</th>
                        <th className="py-2.5">Available Supply</th>
                        <th className="py-2.5">Relevant Pool</th>
                        <th className="py-2.5">Hires</th>
                        <th className="py-2.5">Advertised Wage</th>
                        <th className="py-2.5">Agreed Wage</th>
                        <th className="py-2.5">Shortage Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-medium">
                      {skillData.skills?.map((s, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/40">
                          <td className="py-2.5 font-bold uppercase text-on-surface">{s.skill}</td>
                          <td className="py-2.5 font-mono font-bold text-amber-600">{s.openJobs}</td>
                          <td className="py-2.5 font-mono font-bold text-emerald-600">{s.availableWorkers}</td>
                          <td className="py-2.5 font-mono text-on-surface-variant">{s.relevantWorkers}</td>
                          <td className="py-2.5 font-mono">{s.hires}</td>
                          <td className="py-2.5 font-mono font-semibold">{s.avgAdvertisedWage}</td>
                          <td className="py-2.5 font-mono font-semibold text-primary">{s.avgAgreedWage}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                s.gap > 0 ? 'bg-error/15 text-error' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {s.gap > 0 ? `+${s.gap} needed` : 'Balanced'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {skillData.definitions && (
                  <div className="p-3 bg-surface-container-low rounded-xl text-[10px] text-on-surface-variant space-y-1">
                    <div>
                      <strong>Supply Definition:</strong> {skillData.definitions.supply}
                    </div>
                    <div>
                      <strong>Gap Definition:</strong> {skillData.definitions.gap}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENTS & FINANCIAL TELEMETRY */}
          {activeTab === 'payments' && paymentData && (
            <div className="space-y-6">
              {/* Financial Distinction Notice */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Financial Classification & Worker Wage Protection Rule
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-blue-800">
                  {paymentData.distinction?.note}
                </div>
              </div>

              {/* Wage Value vs Recorded Payments vs Platform Revenue */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">
                    Agreed Wage Value
                  </div>
                  <div className="text-xl font-black text-on-surface font-mono mt-1">
                    ₹{paymentData.distinction?.totalAgreedWageValue || 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-1">From confirmed hiring agreements</div>
                </div>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">
                    Recorded Worker Wages
                  </div>
                  <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                    ₹{paymentData.totals?.recordedAmount || 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-1">
                    {paymentData.totals?.recordedCount || 0} payouts recorded
                  </div>
                </div>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">
                    Disputed Payment Amount
                  </div>
                  <div className="text-xl font-black text-error font-mono mt-1">
                    ₹{paymentData.totals?.disputedAmount || 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-1">In open dispute arbitration</div>
                </div>

                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">
                    Platform Revenue
                  </div>
                  <div className="text-xl font-black text-slate-500 font-mono mt-1">
                    ₹{paymentData.distinction?.platformRevenue || 0}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-1">0% commission platform policy</div>
                </div>
              </div>

              {/* Payments by Skill & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
                  <div className="text-xs font-bold uppercase text-on-surface tracking-wider">
                    Wage Payouts by Skill Category
                  </div>
                  <div className="space-y-2">
                    {paymentData.bySkill?.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low text-xs"
                      >
                        <span className="font-bold text-on-surface uppercase">{s.skill}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-600">₹{s.amount}</span>
                          <span className="text-[10px] text-on-surface-variant">({s.count} txns)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
                  <div className="text-xs font-bold uppercase text-on-surface tracking-wider">
                    Wage Payouts by City
                  </div>
                  <div className="space-y-2">
                    {paymentData.byLocation?.map((l, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low text-xs"
                      >
                        <span className="font-bold text-on-surface">{l.city}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-600">₹{l.amount}</span>
                          <span className="text-[10px] text-on-surface-variant">({l.count} txns)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ATTENDANCE */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Present</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {attendanceData.records?.present || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Half-Day</div>
                  <div className="text-2xl font-black text-amber-500 mt-1">
                    {attendanceData.records?.halfDay || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Absent</div>
                  <div className="text-2xl font-black text-error mt-1">
                    {attendanceData.records?.absent || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Leave</div>
                  <div className="text-2xl font-black text-slate-500 mt-1">
                    {attendanceData.records?.leave || 0}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Attendance Rate</div>
                  <div className="text-2xl font-black text-primary mt-1">
                    {attendanceData.records?.attendanceRate || '0%'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
                <strong>Audit Formula:</strong> {attendanceData.records?.rateFormula}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
