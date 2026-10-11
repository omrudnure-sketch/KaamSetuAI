import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getEmployerApplications,
  shortlistApplication,
  selectApplication,
  rejectApplication,
} from '../services/applicationService.js';
import { createHiringAgreement } from '../services/hiringService.js';
import {
  ArrowLeft,
  Users,
  Building,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  UserCheck,
  UserX,
  MessageSquare,
  Send,
} from 'lucide-react';

export const EmployerJobApplicationsPage = () => {
  const { id: jobId } = useParams();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Proposal Modal State
  const [selectedAppForHiring, setSelectedAppForHiring] = useState(null);
  const [hiringForm, setHiringForm] = useState({
    durationType: 'fixed_duration',
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    wageType: 'daily',
    proposedWage: '',
    workingHours: { start: '09:00', end: '18:00', description: 'Standard day shift' },
    message: '',
  });
  const [hiringSubmitting, setHiringSubmitting] = useState(false);
  const [hiringError, setHiringError] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const params = jobId ? { jobId } : {};
      const res = await getEmployerApplications(params);
      if (res.success) {
        setApplications(res.data);
      } else {
        setError(res.error?.message || 'Failed to load applications');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [jobId]);

  const handleShortlist = async (appId) => {
    try {
      setActionMessage('');
      const res = await shortlistApplication(appId);
      if (res.success) {
        setActionMessage('Application shortlisted.');
        fetchApplications();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to shortlist');
    }
  };

  const handleSelect = async (appId) => {
    try {
      setActionMessage('');
      const res = await selectApplication(appId);
      if (res.success) {
        setActionMessage('Worker selected! You can now initiate a hiring agreement.');
        fetchApplications();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to select worker');
    }
  };

  const handleReject = async (appId) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return;
    try {
      setActionMessage('');
      const res = await rejectApplication(appId);
      if (res.success) {
        setActionMessage('Application rejected.');
        fetchApplications();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reject application');
    }
  };

  const openHiringModal = (app) => {
    setSelectedAppForHiring(app);
    const validStart = app.jobId?.startDate && !isNaN(new Date(app.jobId.startDate).getTime())
      ? new Date(app.jobId.startDate).toISOString().split('T')[0]
      : new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const validEnd = app.jobId?.estimatedEndDate && !isNaN(new Date(app.jobId.estimatedEndDate).getTime())
      ? new Date(app.jobId.estimatedEndDate).toISOString().split('T')[0]
      : '';

    setHiringForm({
      durationType: app.jobId?.durationType || 'fixed_duration',
      startDate: validStart,
      estimatedEndDate: validEnd,
      wageType: app.jobId?.wageType || 'daily',
      proposedWage: app.proposedWage || app.jobId?.wageAmount || '',
      workingHours: app.jobId?.workingHours || { start: '09:00', end: '18:00', description: '' },
      message: `Initial hiring proposal for ${app.jobId?.title || 'job'}.`,
    });
  };

  const handleHiringSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppForHiring) return;
    try {
      setHiringSubmitting(true);
      setHiringError('');

      const appId = selectedAppForHiring.id || selectedAppForHiring._id;
      const payload = {
        sourceType: 'application',
        sourceId: appId,
        durationType: hiringForm.durationType,
        startDate: hiringForm.startDate,
        estimatedEndDate: hiringForm.estimatedEndDate || null,
        wageType: hiringForm.wageType,
        proposedWage: Number(hiringForm.proposedWage),
        workingHours: hiringForm.workingHours,
        message: hiringForm.message,
      };

      const res = await createHiringAgreement(payload);
      if (res.success && res.data) {
        setSelectedAppForHiring(null);
        navigate(`/employer/hiring/${res.data.id || res.data._id}`);
      } else {
        setHiringError(res.error?.message || 'Failed to create hiring agreement');
      }
    } catch (err) {
      setHiringError(err.response?.data?.error?.message || 'Hiring agreement creation failed');
    } finally {
      setHiringSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'shortlisted':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'selected':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'withdrawn':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/employer/jobs')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Jobs
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            <span>Job Applications</span>
          </h1>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading applications...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-white border border-rose-200 rounded-2xl text-center text-rose-700 space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-3 shadow-sm">
          <Users className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold">No applications received for this job yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(app.status)}`}>
                      {app.status.toUpperCase()}
                    </span>
                    {app.workerId?.preferredLanguage && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Lang: {app.workerId.preferredLanguage.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {app.workerId?.name || 'Worker Name'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {app.workerId?.phone || app.workerId?.email}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Worker Proposed Wage</span>
                    <p className="text-xl font-extrabold text-emerald-700">₹{app.proposedWage}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {app.status === 'pending' && (
                      <button
                        onClick={() => handleShortlist(app._id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all"
                      >
                        Shortlist
                      </button>
                    )}

                    {(app.status === 'pending' || app.status === 'shortlisted') && (
                      <button
                        onClick={() => handleSelect(app._id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm"
                      >
                        Select Worker
                      </button>
                    )}

                    {app.status === 'selected' && (
                      <button
                        onClick={() => openHiringModal(app)}
                        className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Propose Agreement</span>
                      </button>
                    )}

                    {app.status !== 'rejected' && app.status !== 'withdrawn' && (
                      <button
                        onClick={() => handleReject(app._id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                        title="Reject Application"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Applied: {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  {app.message && (
                    <span className="text-slate-600 italic max-w-md truncate">
                      "{app.message}"
                    </span>
                  )}
                </div>

                {app.jobId?.title && (
                  <span className="text-slate-500">
                    Job: <strong className="text-slate-700">{app.jobId.title}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Modal */}
      {selectedAppForHiring && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create Hiring Agreement</h3>
              <button onClick={() => setSelectedAppForHiring(null)} className="text-slate-400 hover:text-slate-700 text-sm">
                ✕
              </button>
            </div>

            {hiringError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {hiringError}
              </div>
            )}

            <form onSubmit={handleHiringSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wage Type</label>
                  <select
                    value={hiringForm.wageType}
                    onChange={(e) => setHiringForm({ ...hiringForm, wageType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                  >
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="fixed">Fixed Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Wage (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={hiringForm.proposedWage}
                    onChange={(e) => setHiringForm({ ...hiringForm, proposedWage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration Type</label>
                  <select
                    value={hiringForm.durationType}
                    onChange={(e) => setHiringForm({ ...hiringForm, durationType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                  >
                    <option value="single_day">Single Day</option>
                    <option value="fixed_duration">Fixed Duration</option>
                    <option value="until_completion">Until Completion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={hiringForm.startDate}
                    onChange={(e) => setHiringForm({ ...hiringForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                  />
                </div>
              </div>

              {hiringForm.durationType === 'fixed_duration' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated End Date</label>
                  <input
                    type="date"
                    required
                    value={hiringForm.estimatedEndDate}
                    onChange={(e) => setHiringForm({ ...hiringForm, estimatedEndDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Proposal Note</label>
                <textarea
                  rows="3"
                  placeholder="Terms or working conditions note for the worker..."
                  value={hiringForm.message}
                  onChange={(e) => setHiringForm({ ...hiringForm, message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-primary"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedAppForHiring(null)}
                  className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hiringSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm"
                >
                  {hiringSubmitting ? 'Creating...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
