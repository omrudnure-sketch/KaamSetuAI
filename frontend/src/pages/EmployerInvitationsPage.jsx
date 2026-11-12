import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getEmployerInvitations, inviteWorker, cancelInvitation } from '../services/invitationService.js';
import { getEmployerJobs } from '../services/jobApi.js';
import {
  Mail,
  Plus,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Users,
  Briefcase,
  X,
} from 'lucide-react';

export const EmployerInvitationsPage = () => {
  const [searchParams] = useSearchParams();
  const [invitations, setInvitations] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // New Invitation Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    jobId: '',
    workerId: searchParams.get('workerId') || '',
    proposedWage: '',
    message: '',
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    const paramWorkerId = searchParams.get('workerId');
    if (paramWorkerId) {
      setInviteForm((prev) => ({ ...prev, workerId: paramWorkerId }));
      setShowInviteModal(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [invRes, jobsRes] = await Promise.all([
        getEmployerInvitations(),
        getEmployerJobs(),
      ]);

      if (invRes?.success && Array.isArray(invRes?.data)) {
        setInvitations(invRes.data);
      }
      if (jobsRes?.success && Array.isArray(jobsRes?.data)) {
        const openJobs = jobsRes.data.filter((j) => j.status === 'open');
        setJobs(openJobs);
        if (openJobs.length > 0) {
          setInviteForm((prev) => ({
            ...prev,
            jobId: prev.jobId || openJobs[0]._id,
            proposedWage: prev.proposedWage || openJobs[0].wageAmount,
          }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load invitations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      setActionMessage('');
      const res = await cancelInvitation(id);
      if (res?.success) {
        setActionMessage('Invitation cancelled successfully.');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel invitation');
    }
  };

  const handleJobSelectChange = (e) => {
    const selectedJobId = e.target.value;
    const selectedJob = jobs.find((j) => j._id === selectedJobId);
    setInviteForm({
      ...inviteForm,
      jobId: selectedJobId,
      proposedWage: selectedJob ? selectedJob.wageAmount : inviteForm.proposedWage,
    });
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      setInviteSubmitting(true);
      setInviteError('');

      const payload = {
        jobId: inviteForm.jobId,
        workerId: inviteForm.workerId.trim(),
        proposedWage: Number(inviteForm.proposedWage),
        message: inviteForm.message,
      };

      const res = await inviteWorker(payload);
      if (res?.success) {
        setShowInviteModal(false);
        setActionMessage('Direct job invitation sent to worker!');
        fetchData();
      } else {
        setInviteError(res?.error?.message || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteError(err.response?.data?.error?.message || 'Invitation creation failed');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status = '') => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'ks-badge-amber';
      case 'accepted':
        return 'ks-badge-emerald';
      case 'rejected':
        return 'ks-badge-rose';
      case 'cancelled':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="ks-badge-cyan">
                <Sparkles className="w-3.5 h-3.5" /> Direct Outreach
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-7 h-7 text-primary dark:text-sky-400" />
              <span>Worker Invitations</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Invite top verified workers directly to apply or join your open job postings
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/employer/workers" className="ks-btn-outline text-xs px-4 py-2 font-bold">
              Find Workers
            </Link>
            <button
              onClick={() => setShowInviteModal(true)}
              className="ks-btn-primary text-xs px-4 py-2.5 font-bold flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Worker</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-12 text-center ks-glass-card">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading invitations...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 ks-glass-card border-rose-500/30 text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-semibold text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="w-full p-12 ks-glass-card text-center space-y-4">
          <Mail className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No job invitations sent yet</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            You can search for skilled workers in the directory and invite them directly to work on your sites.
          </p>
          <div className="pt-2">
            <Link to="/employer/workers" className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>Browse Worker Directory</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => {
            const statusStr = inv?.status || 'pending';
            const dateStr = inv?.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '';
            return (
              <div
                key={inv._id}
                className="ks-glass-card p-5 space-y-4 hover:border-primary/40 dark:hover:border-sky-500/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(statusStr)}`}>
                        {statusStr.toUpperCase()}
                      </span>
                      {inv.jobId?.skillRequired && (
                        <span className="ks-badge-cyan text-xs capitalize">
                          {inv.jobId.skillRequired}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Worker: <span className="text-primary dark:text-sky-400">{inv.workerId?.name || ('ID: ' + inv.workerId)}</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Job: <strong className="text-slate-900 dark:text-white">{inv.jobId?.title || 'Job Opportunity'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Offered Wage</span>
                      <p className="text-xl font-black text-emerald-500 dark:text-emerald-400">₹{inv.proposedWage ?? 0}</p>
                    </div>

                    {statusStr.toLowerCase() === 'pending' && (
                      <button
                        onClick={() => handleCancel(inv._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sent: {dateStr}</span>
                    </span>
                    {inv.message && (
                      <span className="italic max-w-md truncate text-slate-700 dark:text-slate-300">
                        &ldquo;{inv.message}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ks-glass-card max-w-lg w-full p-6 space-y-5 shadow-2xl border-white/20">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary dark:text-sky-400" />
                <span>Direct Job Invitation</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Open Job</label>
                <select
                  value={inviteForm.jobId}
                  onChange={handleJobSelectChange}
                  className="ks-input text-xs"
                  required
                >
                  {jobs.length === 0 ? (
                    <option value="">No open jobs available</option>
                  ) : (
                    jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} (₹{j.wageAmount}/{j.wageType})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Worker User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Worker MongoDB User ID"
                  value={inviteForm.workerId}
                  onChange={(e) => setInviteForm({ ...inviteForm, workerId: e.target.value })}
                  className="ks-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Proposed Wage (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inviteForm.proposedWage}
                  onChange={(e) => setInviteForm({ ...inviteForm, proposedWage: e.target.value })}
                  className="ks-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Invitation Message</label>
                <textarea
                  rows="3"
                  placeholder="Personalized invitation message for worker..."
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="ks-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="ks-btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting || jobs.length === 0}
                  className="ks-btn-primary text-xs px-5 py-2 font-bold shadow-xs"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerInvitationsPage;
