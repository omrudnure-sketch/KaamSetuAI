import React, { useState, useEffect } from 'react';
import { getEmployerInvitations, inviteWorker, cancelInvitation } from '../services/invitationService.js';
import { getEmployerJobs } from '../services/jobApi.js';
import { Mail, Plus, Building, DollarSign, Clock, AlertCircle, CheckCircle2, XCircle, Trash2, Send } from 'lucide-react';

export const EmployerInvitationsPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // New Invitation Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    jobId: '',
    workerId: '',
    proposedWage: '',
    message: '',
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [invRes, jobsRes] = await Promise.all([
        getEmployerInvitations(),
        getEmployerJobs(),
      ]);

      if (invRes.success) {
        setInvitations(invRes.data);
      }
      if (jobsRes.success) {
        const openJobs = jobsRes.data.filter((j) => j.status === 'open');
        setJobs(openJobs);
        if (openJobs.length > 0) {
          setInviteForm((prev) => ({
            ...prev,
            jobId: openJobs[0]._id,
            proposedWage: openJobs[0].wageAmount,
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
      if (res.success) {
        setActionMessage('Invitation cancelled.');
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
      if (res.success) {
        setShowInviteModal(false);
        setActionMessage('Direct job invitation sent to worker!');
        fetchData();
      } else {
        setInviteError(res.error?.message || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteError(err.response?.data?.error?.message || 'Invitation creation failed');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            <span>Worker Invitations</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Send direct job invitations to workers for your open positions
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Worker</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading invitations...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-3 shadow-sm">
          <Mail className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-800">No job invitations sent yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv._id}
              className="bg-white border border-slate-200 hover:border-primary/40 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(inv.status)}`}>
                      {inv.status.toUpperCase()}
                    </span>
                    {inv.jobId?.skillRequired && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {inv.jobId.skillRequired}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Worker: {inv.workerId?.name || 'Worker ID: ' + inv.workerId}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Job: <strong className="text-slate-800">{inv.jobId?.title || 'Job Title'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Offered Wage</span>
                    <p className="text-xl font-extrabold text-emerald-700">₹{inv.proposedWage}</p>
                  </div>

                  {inv.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(inv._id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Sent: {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  {inv.message && (
                    <span className="text-slate-700 italic max-w-md truncate">
                      "{inv.message}"
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Direct Job Invitation</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Open Job</label>
                <select
                  value={inviteForm.jobId}
                  onChange={handleJobSelectChange}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Worker User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Worker MongoDB User ID"
                  value={inviteForm.workerId}
                  onChange={(e) => setInviteForm({ ...inviteForm, workerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Wage (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inviteForm.proposedWage}
                  onChange={(e) => setInviteForm({ ...inviteForm, proposedWage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invitation Message</label>
                <textarea
                  rows="3"
                  placeholder="Personalized invitation message for worker..."
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting || jobs.length === 0}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
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

