import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProjectById,
  startProject,
  requestCompletion,
  completeProject,
  cancelProject,
} from '../services/projectService.js';
import { getProjectAttendance } from '../services/attendanceService.js';
import { getProjectProgress } from '../services/progressService.js';
import { requestExtension, getProjectExtensions, approveExtension, rejectExtension, cancelExtension } from '../services/extensionService.js';
import { getProjectPayments, recordPayment } from '../services/paymentService.js';
import { createReview, getProjectReviews } from '../services/reviewService.js';
import { getProjectSummary } from '../services/aiService.js';
import { AiSummaryCard } from '../components/AiSummaryCard.jsx';
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Play,
  Check,
  XCircle,
  TrendingUp,
  History,
  ListCheck,
  PlusCircle,
  DollarSign,
  Star,
  CheckSquare,
} from 'lucide-react';

export const EmployerProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  const [projectData, setProjectData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forms State
  const [extForm, setExtForm] = useState({
    requestedEndDate: '',
    proposedWage: '',
    reason: '',
  });

  const [payForm, setPayForm] = useState({
    projectWorkerId: '',
    type: 'daily',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
    notes: '',
  });

  const [reviewForm, setReviewForm] = useState({
    revieweeId: '',
    rating: 5,
    comment: '',
  });

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProjectById(id);
      if (res.success && res.data) {
        setProjectData(res.data);
        if (res.data.workers && res.data.workers.length > 0) {
          setPayForm((prev) => ({ ...prev, projectWorkerId: res.data.workers[0]._id }));
          setReviewForm((prev) => ({ ...prev, revieweeId: res.data.workers[0].workerId?._id || res.data.workers[0].workerId }));
        }
      } else {
        setError(res.error?.message || 'Failed to fetch project details');
      }

      // Fetch related collections & AI summary
      const [attRes, progRes, extRes, payRes, revRes, sumRes] = await Promise.all([
        getProjectAttendance(id).catch(() => ({ data: [] })),
        getProjectProgress(id).catch(() => ({ data: [] })),
        getProjectExtensions(id).catch(() => ({ data: [] })),
        getProjectPayments(id).catch(() => ({ data: [] })),
        getProjectReviews(id).catch(() => ({ data: [] })),
        getProjectSummary(id).catch(() => ({ data: null })),
      ]);

      setAttendanceRecords(attRes.data || []);
      setProgressUpdates(progRes.data || []);
      setExtensions(extRes.data || []);
      setPayments(payRes.data || []);
      setReviews(revRes.data || []);
      if (sumRes?.data) setSummaryData(sumRes.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await getProjectSummary(id);
      if (res?.data) setSummaryData(res.data);
    } catch (err) {
      console.warn('Failed to refresh project summary', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleStartProject = async () => {
    try {
      setActionMessage('');
      const res = await startProject(id);
      if (res.success) {
        setActionMessage('Project started! Status is now IN PROGRESS.');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start project');
    }
  };

  const handleRequestCompletion = async () => {
    try {
      setActionMessage('');
      const res = await requestCompletion(id);
      if (res.success) {
        setActionMessage('Completion requested for project.');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to request completion');
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm('Are you sure you want to mark this project as COMPLETED?')) return;
    try {
      setActionMessage('');
      const res = await completeProject(id);
      if (res.success) {
        setActionMessage('Project COMPLETED! Progress locked to 100%.');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to complete project');
    }
  };

  const handleCancelProject = async () => {
    if (!window.confirm('Are you sure you want to CANCEL this project?')) return;
    try {
      setActionMessage('');
      const res = await cancelProject(id);
      if (res.success) {
        setActionMessage('Project CANCELLED.');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel project');
    }
  };

  const handleExtensionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await requestExtension(id, {
        requestedEndDate: extForm.requestedEndDate,
        proposedWage: extForm.proposedWage ? Number(extForm.proposedWage) : undefined,
        reason: extForm.reason,
      });
      setActionMessage('Extension request created successfully!');
      setExtForm({ requestedEndDate: '', proposedWage: '', reason: '' });
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request extension');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExtension = async (extId) => {
    try {
      await approveExtension(extId);
      setActionMessage('Extension approved!');
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve extension');
    }
  };

  const handleRejectExtension = async (extId) => {
    try {
      await rejectExtension(extId);
      setActionMessage('Extension rejected!');
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject extension');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await recordPayment(id, {
        projectWorkerId: payForm.projectWorkerId,
        type: payForm.type,
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        method: payForm.method,
        reference: payForm.reference,
        notes: payForm.notes,
      });
      setActionMessage('Payment recorded successfully!');
      setPayForm((prev) => ({ ...prev, amount: '', reference: '', notes: '' }));
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createReview(id, {
        revieweeId: reviewForm.revieweeId,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setActionMessage('Review for worker submitted successfully!');
      setReviewForm((prev) => ({ ...prev, comment: '' }));
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-850 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">{error || 'Project Not Found'}</h2>
        <button
          onClick={() => navigate('/employer/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employer Projects
        </button>
      </div>
    );
  }

  const { project, workers } = projectData;
  const totalPaid = payments.filter((p) => p.status === 'recorded').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employer/projects')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employer Projects</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Overview Card */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-md border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {project.status.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{project.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{project.description}</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left sm:text-right">
            <p className="text-xs text-slate-400 uppercase font-semibold">Payment Rate</p>
            <p className="text-3xl font-extrabold text-emerald-400">₹{project.paymentAmount}</p>
            <p className="text-xs text-slate-400">per {project.paymentType}</p>
          </div>
        </div>

        {/* Status Action Buttons */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Status Controls</p>
            <p className="text-sm font-bold text-white">State: <span className="text-cyan-400">{project.status}</span></p>
          </div>

          <div className="flex items-center gap-2">
            {project.status === 'confirmed' && (
              <button
                onClick={handleStartProject}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" /> Start Project
              </button>
            )}

            {project.status === 'in_progress' && (
              <button
                onClick={handleRequestCompletion}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" /> Request Completion
              </button>
            )}

            {(project.status === 'in_progress' || project.status === 'completion_requested') && (
              <button
                onClick={handleCompleteProject}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Mark Completed
              </button>
            )}

            {project.status !== 'completed' && project.status !== 'closed' && project.status !== 'cancelled' && (
              <button
                onClick={handleCancelProject}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Cancel Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'progress', label: 'Progress' },
          { id: 'extensions', label: 'Extensions' },
          { id: 'payments', label: 'Payments' },
          { id: 'reviews', label: 'Reviews' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Project Overview</h2>

          {/* AI-Powered Project Summary (Step 25) */}
          <AiSummaryCard
            summaryData={summaryData}
            loading={summaryLoading}
            onRefresh={handleRefreshSummary}
            lang="en"
            type="project"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">Start Date</span>
              <p className="font-bold text-white mt-1">{new Date(project.startDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">Expected End Date</span>
              <p className="font-bold text-white mt-1">
                {project.currentExpectedEndDate ? new Date(project.currentExpectedEndDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">Original Estimated End</span>
              <p className="font-bold text-slate-400 mt-1">
                {project.originalEstimatedEndDate ? new Date(project.originalEstimatedEndDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Overall Progress Percentage</span>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white font-semibold">Progress</span>
              <span className="text-cyan-400 font-extrabold">{project.progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${project.progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Assigned Workers */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Assigned Workers ({workers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workers.map((w) => (
                <div key={w._id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white text-sm">{w.workerId?.name || 'Worker'}</p>
                    <p className="text-slate-400 mt-0.5">{w.workerId?.phone || w.workerId?.email}</p>
                    <p className="text-emerald-400 font-semibold mt-1">Agreed Wage: ₹{w.agreedWage}/{w.wageType}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Worker Attendance Records</h2>

          {attendanceRecords.length === 0 ? (
            <p className="text-slate-400 text-sm italic">No attendance records logged yet.</p>
          ) : (
            <div className="space-y-3">
              {attendanceRecords.map((att) => (
                <div key={att._id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white text-sm">{att.workerId?.name || 'Worker'}</p>
                    <p className="text-slate-400 mt-0.5">
                      Date: <strong className="text-slate-200">{att.date}</strong> | Status: <span className="text-emerald-400 font-bold uppercase">{att.status}</span>
                    </p>
                  </div>
                  <div className="text-right text-slate-300">
                    <p>In: {att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : 'N/A'}</p>
                    <p>Out: {att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROGRESS */}
      {activeTab === 'progress' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Daily Progress Timeline</h2>

          {progressUpdates.length === 0 ? (
            <p className="text-slate-400 text-sm italic">No daily progress updates submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {progressUpdates.map((prog) => (
                <div key={prog._id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{prog.workerId?.name || 'Worker'}</span>
                      <span className="text-xs font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {prog.date}
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-400">{prog.percentage}%</span>
                  </div>
                  {prog.description && <p className="text-xs text-slate-300">{prog.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXTENSIONS */}
      {activeTab === 'extensions' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Project Extensions</h2>

          {/* Form */}
          <form onSubmit={handleExtensionSubmit} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-cyan-400" /> Request Duration Extension
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Requested End Date</label>
                <input
                  type="date"
                  value={extForm.requestedEndDate}
                  onChange={(e) => setExtForm({ ...extForm, requestedEndDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Proposed Revised Wage (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={extForm.proposedWage}
                  onChange={(e) => setExtForm({ ...extForm, proposedWage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Extension</label>
              <textarea
                rows="2"
                placeholder="Describe reason..."
                value={extForm.reason}
                onChange={(e) => setExtForm({ ...extForm, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
            >
              Submit Extension Request
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Extension History</h3>
            {extensions.length === 0 ? (
              <p className="text-xs text-slate-500">No extension requests found.</p>
            ) : (
              <div className="space-y-3">
                {extensions.map((ext) => (
                  <div key={ext._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Requested End: {new Date(ext.requestedEndDate).toLocaleDateString()}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        ext.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ext.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ext.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">Reason: {ext.reason}</p>

                    {ext.status === 'pending' && ext.employerApproval === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleApproveExtension(ext._id)}
                          className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg"
                        >
                          Approve Extension
                        </button>
                        <button
                          onClick={() => handleRejectExtension(ext._id)}
                          className="px-3 py-1 bg-rose-500 text-white font-bold text-xs rounded-lg"
                        >
                          Reject Extension
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">Project Payment Ledger</h2>
            <span className="text-sm font-bold text-emerald-400">Total Recorded: ₹{totalPaid.toLocaleString()}</span>
          </div>

          {/* Record Payment Form */}
          <form onSubmit={handlePaymentSubmit} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Record Worker Payment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Worker</label>
                <select
                  value={payForm.projectWorkerId}
                  onChange={(e) => setPayForm({ ...payForm, projectWorkerId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  required
                >
                  {workers.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.workerId?.name || 'Worker'} (Wage: ₹{w.agreedWage}/{w.wageType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Type</label>
                <select
                  value={payForm.type}
                  onChange={(e) => setPayForm({ ...payForm, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="milestone">Milestone</option>
                  <option value="final">Final</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 950"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reference / Notes (Optional)</label>
              <input
                type="text"
                placeholder="Receipt / Transaction reference ID"
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              Record Payment
            </button>
          </form>

          {/* Payment History */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Payment Timeline</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500">No payment records found.</p>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {payments.map((p) => (
                  <div key={p._id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{p.workerId?.name || 'Worker'}</span>
                      <span className="ml-2 text-emerald-400 font-bold">₹{p.amount}</span>
                      <span className="ml-2 text-slate-400 capitalize">({p.type} - {p.method})</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{new Date(p.paymentDate).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Project Reviews & Ratings</h2>

          {['completed', 'closed'].includes(project.status) ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-lg">
                <CheckSquare className="w-6 h-6" /> Project Completed ✓
              </div>
              <p className="text-xs text-slate-300">
                Rate the workers who participated in this project. Your review updates their profile average rating.
              </p>

              {/* Review Form */}
              <form onSubmit={handleReviewSubmit} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 mt-4">
                <h3 className="text-sm font-bold text-white">Rate Worker</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Worker to Review</label>
                  <select
                    value={reviewForm.revieweeId}
                    onChange={(e) => setReviewForm({ ...reviewForm, revieweeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                    required
                  >
                    {workers.map((w) => (
                      <option key={w._id} value={w.workerId?._id || w.workerId}>
                        {w.workerId?.name || 'Worker'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rating (1 - 5 Stars)</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - Good)</option>
                    <option value="3">⭐⭐⭐ (3 - Average)</option>
                    <option value="2">⭐⭐ (2 - Below Average)</option>
                    <option value="1">⭐ (1 - Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Comments / Feedback</label>
                  <textarea
                    rows="3"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Write feedback about worker performance, discipline, and skill..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                >
                  Submit Worker Review
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-400">
              Reviews can be submitted after the project status is set to <strong>Completed</strong>.
            </div>
          )}

          {/* List of Published Reviews */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Submitted Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">
                        {rev.reviewerId?.name || 'Participant'} ({rev.reviewerRole}) → {rev.revieweeId?.name || 'User'}
                      </span>
                      <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {rev.rating} / 5
                      </span>
                    </div>
                    {rev.comment && <p className="text-xs text-slate-300 italic">"{rev.comment}"</p>}
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerProjectDetailPage;
