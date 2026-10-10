import React, { useState, useEffect } from 'react';
import {
  getRiskFlags,
  getRiskStats,
  getRiskFlagById,
  scanRiskFlags,
  updateRiskFlagStatus,
  addRiskReviewNote,
} from '../services/adminService.js';

export const AdminFraudRiskPage = () => {
  const [flags, setFlags] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form states in detail modal
  const [newStatus, setNewStatus] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [reviewNoteText, setReviewNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchFlagsAndStats = async (page = 1) => {
    try {
      setLoading(true);
      const [flagsRes, statsRes] = await Promise.all([
        getRiskFlags({
          status: statusFilter,
          riskLevel: levelFilter,
          riskCategory: categoryFilter,
          page,
          limit: 10,
        }),
        getRiskStats().catch(() => ({ data: null })),
      ]);

      if (flagsRes?.data) {
        setFlags(flagsRes.data);
        if (flagsRes.pagination) setPagination(flagsRes.pagination);
      }
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load risk flags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagsAndStats(1);
  }, [statusFilter, levelFilter, categoryFilter]);

  const handleScan = async () => {
    try {
      setScanning(true);
      setScanMessage(null);
      const res = await scanRiskFlags(50);
      setScanMessage({
        type: 'success',
        text: res.message || 'Platform risk scan completed successfully.',
      });
      await fetchFlagsAndStats(1);
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to complete risk scan.',
      });
    } finally {
      setScanning(false);
    }
  };

  const openFlagModal = async (flagId) => {
    try {
      setActionMessage(null);
      const res = await getRiskFlagById(flagId);
      if (res?.data) {
        setSelectedFlag(res.data);
        setNewStatus(res.data.status);
        setResolutionText(res.data.resolution || '');
      }
    } catch (err) {
      console.error('Failed to load flag details:', err);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedFlag) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await updateRiskFlagStatus(selectedFlag._id, {
        status: newStatus,
        resolution: resolutionText,
      });
      setActionMessage({ type: 'success', text: 'Status updated and audit log recorded.' });
      setSelectedFlag(res.data);
      await fetchFlagsAndStats(pagination.page);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to update flag status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedFlag || !reviewNoteText.trim()) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await addRiskReviewNote(selectedFlag._id, { note: reviewNoteText.trim() });
      setActionMessage({ type: 'success', text: 'Review note added and logged.' });
      setSelectedFlag(res.data);
      setReviewNoteText('');
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to add review note.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/20 text-red-500 border border-red-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-500 border border-amber-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed_issue':
        return 'bg-red-600/20 text-red-500 border border-red-600/40';
      case 'under_review':
        return 'bg-blue-500/20 text-blue-500 border border-blue-500/40';
      case 'false_positive':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'resolved':
      case 'dismissed':
        return 'bg-surface-variant text-on-surface-variant border border-outline/30';
      default:
        return 'bg-amber-500/20 text-amber-500 border border-amber-500/40';
    }
  };

  return (
    <div className="w-full space-y-space-md py-2">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-950/80 via-surface-container-high to-surface-container text-on-surface p-space-md shadow-md border border-red-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-label-sm text-xs uppercase tracking-wider text-red-400">
                Fraud & Anomaly Sentinel • जोखिम नियंत्रण
              </span>
            </div>
            <h1 className="font-headline-lg text-xl sm:text-2xl font-bold">
              Fraud & Risk Detection
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Explainable deterministic anomaly detection, risk scoring & human-reviewed moderation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md transition disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${scanning ? 'animate-spin' : ''}`}>
                {scanning ? 'refresh' : 'radar'}
              </span>
              {scanning ? 'Scanning System...' : 'Scan Platform Risk'}
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Safeguard Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div className="text-xs text-on-surface-variant">
          <span className="font-semibold text-amber-500 mr-1.5">Human Review Policy:</span>
          Risk indicators are automated screening signals designed to assist administrators. They may be inaccurate or incomplete.
          Automated penalties and bans are strictly disabled — every adverse action requires human review and creates an immutable audit trail.
        </div>
      </div>

      {scanMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            scanMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-500 border border-red-500/30'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {scanMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{scanMessage.text}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="text-xs text-on-surface-variant font-medium">Total Risk Flags</div>
            <div className="text-2xl font-bold mt-1 text-on-surface">{stats.totalFlags || 0}</div>
            <div className="text-[11px] text-on-surface-variant/70 mt-0.5">Historical signals</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-red-500/20">
            <div className="text-xs text-red-400 font-medium">High / Critical Flags</div>
            <div className="text-2xl font-bold mt-1 text-red-500">{stats.highCriticalFlags || 0}</div>
            <div className="text-[11px] text-on-surface-variant/70 mt-0.5">Requires urgent attention</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-blue-500/20">
            <div className="text-xs text-blue-400 font-medium">Under Review</div>
            <div className="text-2xl font-bold mt-1 text-blue-500">{stats.underReviewFlags || 0}</div>
            <div className="text-[11px] text-on-surface-variant/70 mt-0.5">Admin assigned & investigating</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-purple-500/20">
            <div className="text-xs text-purple-400 font-medium">False Positives</div>
            <div className="text-2xl font-bold mt-1 text-purple-400">{stats.falsePositiveFlags || 0}</div>
            <div className="text-[11px] text-on-surface-variant/70 mt-0.5">Cleared by moderation</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-on-surface-variant font-medium mr-1">Filters:</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="new">New (Unreviewed)</option>
            <option value="under_review">Under Review</option>
            <option value="confirmed_issue">Confirmed Issue</option>
            <option value="false_positive">False Positive</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical (80-100)</option>
            <option value="high">High (60-79)</option>
            <option value="medium">Medium (30-59)</option>
            <option value="low">Low (0-29)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
          >
            <option value="all">All Anomaly Categories</option>
            <option value="account_anomaly">Account Anomaly</option>
            <option value="job_posting_anomaly">Job Posting Anomaly</option>
            <option value="attendance_anomaly">Attendance Anomaly</option>
            <option value="review_pattern">Review Pattern</option>
            <option value="payment_dispute_pattern">Payment Dispute Pattern</option>
          </select>
        </div>

        <button
          onClick={() => fetchFlagsAndStats(pagination.page)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
          title="Refresh List"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      {/* Risk Flags Table */}
      <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[28px] animate-spin mb-2 block">
              progress_activity
            </span>
            Loading risk indicators...
          </div>
        ) : flags.length === 0 ? (
          <div className="p-10 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[36px] text-emerald-500 mb-2 block">
              check_circle
            </span>
            <div className="font-semibold text-sm text-on-surface">No Risk Flags Found</div>
            <p className="mt-1">No anomalous patterns match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container text-on-surface-variant font-medium">
                  <th className="py-2.5 px-3">Subject User</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Detected Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                {flags.map((flag) => {
                  const user = flag.subjectUserId;
                  return (
                    <tr key={flag._id} className="hover:bg-surface-container/50 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold">{user?.name || 'Unknown User'}</div>
                        <div className="text-[11px] text-on-surface-variant">
                          {user?.role} • {user?.email || user?.phone || 'No contact'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface border border-outline-variant/30">
                          {flag.riskCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{flag.score}/100</span>
                          <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                            <div
                              className={`h-full ${
                                flag.score >= 80
                                  ? 'bg-red-500'
                                  : flag.score >= 60
                                  ? 'bg-amber-500'
                                  : flag.score >= 30
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, flag.score)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getLevelBadgeClass(
                            flag.riskLevel
                          )}`}
                        >
                          {flag.riskLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeClass(
                            flag.status
                          )}`}
                        >
                          {flag.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => openFlagModal(flag._id)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs transition"
                        >
                          Inspect & Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
            <div>
              Showing {flags.length} of {pagination.total} records
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchFlagsAndStats(pagination.page - 1)}
                className="px-2 py-1 rounded bg-surface border border-outline-variant disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchFlagsAndStats(pagination.page + 1)}
                className="px-2 py-1 rounded bg-surface border border-outline-variant disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flag Inspection & Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl max-w-2xl w-full border border-outline-variant shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getLevelBadgeClass(
                      selectedFlag.riskLevel
                    )}`}
                  >
                    {selectedFlag.riskLevel}
                  </span>
                  <span className="font-semibold text-sm">
                    Score: {selectedFlag.score}/100 • {selectedFlag.riskCategory}
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant mt-1">
                  Subject User: <span className="font-bold text-on-surface">{selectedFlag.subjectUserId?.name}</span> (
                  {selectedFlag.subjectUserId?.role}) • ID: {selectedFlag.subjectUserId?._id}
                </div>
              </div>
              <button
                onClick={() => setSelectedFlag(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {actionMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {actionMessage.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Explainable Indicators Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-400 text-[16px]">info</span>
                Explainable Risk Indicators ({selectedFlag.indicators?.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedFlag.indicators?.map((ind, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-on-surface">{ind.title}</span>
                      <span className="text-[11px] font-bold text-red-400">+{ind.points} pts</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">{ind.description}</p>
                    {ind.evidence && Object.keys(ind.evidence).length > 0 && (
                      <div className="bg-surface p-2 rounded text-[11px] font-mono text-on-surface-variant border border-outline-variant/20 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(ind.evidence, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence References */}
            {selectedFlag.evidenceReferences?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-semibold text-xs text-on-surface uppercase tracking-wider">
                  Associated System References
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFlag.evidenceReferences.map((ref, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-surface-container text-[11px] border border-outline-variant/20"
                    >
                      {ref.resourceType}: {ref.details || ref.resourceId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status & Resolution Update Form */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <h4 className="font-semibold text-xs text-on-surface uppercase tracking-wider">
                Moderator Decision & Status Transition
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                    Update Status:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="new">New (Unreviewed)</option>
                    <option value="under_review">Under Review</option>
                    <option value="confirmed_issue">Confirmed Issue</option>
                    <option value="false_positive">False Positive</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                    Resolution Reason / Notes:
                  </label>
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="e.g. Verified by phone call with employer"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                {actionLoading ? 'Saving...' : 'Save Decision (Writes Audit Log)'}
              </button>
            </div>

            {/* Review Notes Thread */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-on-surface uppercase tracking-wider">
                Internal Review Notes ({selectedFlag.reviewNotes?.length || 0})
              </h4>
              {selectedFlag.reviewNotes?.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedFlag.reviewNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-surface-container text-xs space-y-0.5 border border-outline-variant/20"
                    >
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                        <span>{note.adminName || 'Admin'}</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-on-surface">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-on-surface-variant/70 italic">No notes recorded yet.</div>
              )}

              {/* Add Note Input */}
              <form onSubmit={handleAddNote} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={reviewNoteText}
                  onChange={(e) => setReviewNoteText(e.target.value)}
                  placeholder="Add administrative review note..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !reviewNoteText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-surface-variant hover:bg-surface-container text-on-surface text-xs font-medium disabled:opacity-50"
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFraudRiskPage;
