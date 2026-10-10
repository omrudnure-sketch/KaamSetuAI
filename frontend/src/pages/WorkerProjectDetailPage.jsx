import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById } from '../services/projectService.js';
import { checkIn, checkOut, getWorkerAttendance } from '../services/attendanceService.js';
import { createOrUpdateProgress, getProjectProgress } from '../services/progressService.js';
import { requestExtension, getProjectExtensions, approveExtension, rejectExtension, cancelExtension } from '../services/extensionService.js';
import { getProjectPayments } from '../services/paymentService.js';
import { createReview, getProjectReviews } from '../services/reviewService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { getProjectSummary } from '../services/aiService.js';
import { AiSummaryCard } from '../components/AiSummaryCard.jsx';
import {
  ArrowLeft,
  Globe,
  Building,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  TrendingUp,
  Camera,
  ListTodo,
  AlertTriangle,
  Send,
  PlusCircle,
  Star,
  CheckSquare,
} from 'lucide-react';

export const WorkerProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lang, setLang] = useState('en');
  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const [activeTab, setActiveTab] = useState('overview');

  const [projectData, setProjectData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [todayProgress, setTodayProgress] = useState(null);

  const [extensions, setExtensions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Forms State
  const [progressForm, setProgressForm] = useState({
    percentage: 50,
    description: '',
    tasksCompletedStr: '',
    blockersStr: '',
    expectedCompletionDate: '',
    photosStr: '',
  });

  const [extForm, setExtForm] = useState({
    requestedEndDate: '',
    proposedWage: '',
    reason: '',
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProjectById(id);
      if (res.success && res.data) {
        setProjectData(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch project details');
      }

      // Fetch attendance
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await getWorkerAttendance({ projectId: id });
      if (attRes.success && attRes.data) {
        setAttendanceList(attRes.data);
        const todayRec = attRes.data.find((r) => r.date === todayStr);
        setAttendance(todayRec || null);
      }

      // Fetch progress
      const progRes = await getProjectProgress(id);
      if (progRes.success && progRes.data) {
        const todayProgRec = progRes.data.find((p) => p.date === todayStr);
        if (todayProgRec) {
          setTodayProgress(todayProgRec);
          setProgressForm({
            percentage: todayProgRec.percentage || 50,
            description: todayProgRec.description || '',
            tasksCompletedStr: (todayProgRec.tasksCompleted || []).join(', '),
            blockersStr: (todayProgRec.blockers || []).join(', '),
            expectedCompletionDate: todayProgRec.expectedCompletionDate
              ? new Date(todayProgRec.expectedCompletionDate).toISOString().split('T')[0]
              : '',
            photosStr: (todayProgRec.photos || []).join(', '),
          });
        }
      }

      // Fetch extensions, payments, reviews, and AI summary
      const [extRes, payRes, revRes, sumRes] = await Promise.all([
        getProjectExtensions(id).catch(() => ({ data: [] })),
        getProjectPayments(id).catch(() => ({ data: [] })),
        getProjectReviews(id).catch(() => ({ data: [] })),
        getProjectSummary(id).catch(() => ({ data: null })),
      ]);

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

  const handleCheckIn = async () => {
    try {
      setActionMessage('');
      const res = await checkIn({ projectId: id, notes: 'Worker Check In' });
      if (res.success) {
        setAttendance(res.data);
        setActionMessage('Checked in successfully!');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionMessage('');
      const res = await checkOut({ projectId: id, notes: 'Worker Check Out' });
      if (res.success) {
        setAttendance(res.data);
        setActionMessage('Checked out successfully!');
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check-out failed');
    }
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        percentage: Number(progressForm.percentage),
        description: progressForm.description,
        tasksCompleted: progressForm.tasksCompletedStr.split(',').map((s) => s.trim()).filter(Boolean),
        blockers: progressForm.blockersStr.split(',').map((s) => s.trim()).filter(Boolean),
        expectedCompletionDate: progressForm.expectedCompletionDate || null,
        photos: progressForm.photosStr.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const res = await createOrUpdateProgress(id, payload);
      if (res.success) {
        setTodayProgress(res.data);
        setActionMessage("Today's progress saved!");
        fetchProjectDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save progress');
    } finally {
      setSubmitting(false);
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
      setActionMessage('Extension request submitted successfully!');
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createReview(id, {
        revieweeId: projectData.project.employerId._id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setActionMessage('Review submitted successfully!');
      setReviewForm({ rating: 5, comment: '' });
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
          onClick={() => navigate('/worker/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </button>
      </div>
    );
  }

  const { project, userWorkerRecord } = projectData;
  const totalPaidAmount = payments.filter((p) => p.status === 'recorded').reduce((acc, p) => acc + p.amount, 0);
  const presentDays = attendanceList.filter((a) => a.status === 'present').length;
  const expectedTotal = presentDays * (userWorkerRecord?.agreedWage || project.paymentAmount || 0);
  const pendingAmount = Math.max(0, expectedTotal - totalPaidAmount);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navigation & Language selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/worker/projects')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Projects</span>
        </button>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <Globe className="w-4 h-4 text-cyan-400 ml-1.5" />
          {['en', 'mr', 'hi'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                lang === l ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l === 'en' ? 'English' : l === 'mr' ? 'मराठी' : 'हिंदी'}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-md border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              {t.statuses[project.status] || project.status}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{project.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Employer: {project.employerId?.name || 'N/A'}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase">Agreed Wage</span>
            <p className="text-3xl font-extrabold text-emerald-400">₹{userWorkerRecord?.agreedWage || project.paymentAmount}</p>
            <span className="text-xs text-slate-400">per {userWorkerRecord?.wageType || project.paymentType}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: t.overview },
          { id: 'attendance', label: t.attendance },
          { id: 'progress', label: t.progress },
          { id: 'extensions', label: t.extensions },
          { id: 'payments', label: t.payments },
          { id: 'reviews', label: t.reviews },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-md'
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
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">{t.overview}</h2>

          {/* AI-Powered Project Summary (Step 25) */}
          <AiSummaryCard
            summaryData={summaryData}
            loading={summaryLoading}
            onRefresh={handleRefreshSummary}
            lang={lang}
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
            <span className="text-xs font-bold text-slate-400 uppercase">Overall Progress</span>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white font-semibold">Project Completion</span>
              <span className="text-cyan-400 font-extrabold">{project.progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${project.progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">{t.attendance}</h2>
            <span className="text-xs bg-slate-800 text-cyan-400 px-3 py-1 rounded-full font-bold">
              Days Worked: {presentDays}
            </span>
          </div>

          {project.status === 'in_progress' && (
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-white">Today's Shift Status</p>
                <p className="text-xs text-slate-400">
                  {attendance?.checkOut
                    ? 'Check-out completed'
                    : attendance?.checkIn
                    ? 'Checked in, shift active'
                    : 'Not checked in yet'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!attendance && (
                  <button
                    onClick={handleCheckIn}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" /> {t.checkIn}
                  </button>
                )}
                {attendance && !attendance.checkOut && (
                  <button
                    onClick={handleCheckOut}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" /> {t.checkOut}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Attendance History</h3>
            {attendanceList.length === 0 ? (
              <p className="text-xs text-slate-500">No attendance records found.</p>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {attendanceList.map((a) => (
                  <div key={a._id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{a.date}</span>
                      <span className="ml-3 text-emerald-400 font-semibold capitalize">● {a.status}</span>
                    </div>
                    <div className="text-slate-400">
                      In: {a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : 'N/A'} | Out: {a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROGRESS */}
      {activeTab === 'progress' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">{t.progress}</h2>
          <form onSubmit={handleProgressSubmit} className="space-y-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Updated Progress % ({progressForm.percentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progressForm.percentage}
                onChange={(e) => setProgressForm({ ...progressForm, percentage: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.description}</label>
              <textarea
                rows="3"
                value={progressForm.description}
                onChange={(e) => setProgressForm({ ...progressForm, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              {todayProgress ? t.updateProgress : t.saveProgress}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: EXTENSIONS */}
      {activeTab === 'extensions' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">{t.extensions}</h2>

          {/* Request Form */}
          <form onSubmit={handleExtensionSubmit} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-cyan-400" /> {t.requestExtension}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.requestedEndDate}</label>
                <input
                  type="date"
                  value={extForm.requestedEndDate}
                  onChange={(e) => setExtForm({ ...extForm, requestedEndDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.proposedWage}</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.reason}</label>
              <textarea
                rows="2"
                placeholder="State the reason for duration extension..."
                value={extForm.reason}
                onChange={(e) => setExtForm({ ...extForm, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              Submit Request
            </button>
          </form>

          {/* Extension Requests List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Extension History</h3>
            {extensions.length === 0 ? (
              <p className="text-xs text-slate-500">{t.noExtensions}</p>
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
                    <div className="text-[11px] text-slate-400 flex gap-4 pt-1">
                      <span>Worker Approval: <strong className="capitalize">{ext.workerApproval}</strong></span>
                      <span>Employer Approval: <strong className="capitalize">{ext.employerApproval}</strong></span>
                    </div>

                    {ext.status === 'pending' && ext.workerApproval === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleApproveExtension(ext._id)}
                          className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg"
                        >
                          {t.approve}
                        </button>
                        <button
                          onClick={() => handleRejectExtension(ext._id)}
                          className="px-3 py-1 bg-rose-500 text-white font-bold text-xs rounded-lg"
                        >
                          {t.reject}
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
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">{t.payments}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">{t.expectedAmount}</span>
              <p className="text-xl font-bold text-white mt-1">₹{expectedTotal.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">{t.paidAmount}</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">₹{totalPaidAmount.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500">{t.pendingAmount}</span>
              <p className="text-xl font-bold text-amber-400 mt-1">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">{t.paymentHistory}</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500">{t.noPayments}</p>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {payments.map((p) => (
                  <div key={p._id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">₹{p.amount}</span>
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
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">{t.reviews}</h2>

          {/* Project Completed Banner */}
          {['completed', 'closed'].includes(project.status) ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-lg">
                <CheckSquare className="w-6 h-6" /> {t.projectCompletedBadge}
              </div>
              <p className="text-xs text-slate-300">
                This project is complete! You can leave a review and rating for your employer below.
              </p>

              {/* Review Form */}
              <form onSubmit={handleReviewSubmit} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 mt-4">
                <h3 className="text-sm font-bold text-white">{t.rateEmployer}</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.rating} (1 - 5 Stars)</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.comment}</label>
                  <textarea
                    rows="3"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your experience working with this employer..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  {t.submitReview}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-400">
              Reviews can be submitted once the project status is set to <strong>Completed</strong>.
            </div>
          )}

          {/* Published Reviews List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Project Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500">{t.noReviews}</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">
                        {rev.reviewerId?.name || 'Participant'} ({rev.reviewerRole})
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

export default WorkerProjectDetailPage;
