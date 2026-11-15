import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProjectById } from '../services/projectService.js';
import { checkIn, checkOut, getWorkerAttendance } from '../services/attendanceService.js';
import { createOrUpdateProgress, getProjectProgress } from '../services/progressService.js';
import { requestExtension, getProjectExtensions, approveExtension, rejectExtension } from '../services/extensionService.js';
import { getProjectPayments } from '../services/paymentService.js';
import { createReview, getProjectReviews } from '../services/reviewService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { getProjectSummary } from '../services/aiService.js';
import { AiSummaryCard } from '../components/AiSummaryCard.jsx';
import { GlassSpringNav } from '../components/GlassSpringNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
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
  Star,
  CheckSquare,
  Phone,
  Mail,
  MapPin,
  Navigation,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  Sparkles,
  FileText,
  DollarSign,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export const WorkerProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      alert(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to save progress');
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
      const employerId = projectData?.project?.employerId?._id || projectData?.project?.employerId;
      await createReview(id, {
        revieweeId: employerId,
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

  if (user && user.role !== 'worker') {
    const userRoleRedirect = `/${user.role}`;
    const currentUserLabel = user.role === 'employer' ? 'Employer' : 'Administrator';

    return (
      <div className="w-full max-w-xl mx-auto py-12 px-4">
        <div className="ks-glass-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            This page is available to workers only
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You are signed in as a <strong className="text-slate-900 dark:text-white">{currentUserLabel}</strong>. Worker project operations can only be accessed by assigned workers.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to={userRoleRedirect}
              className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <span>Go to {currentUserLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center ks-glass-card">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading project details...</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 ks-glass-card text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{error || 'Project Not Found'}</h2>
        <button
          onClick={() => navigate('/worker/projects')}
          className="ks-btn-outline inline-flex items-center gap-2 text-xs font-semibold"
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
      {/* Language Switcher */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <Globe className="w-4 h-4 text-primary dark:text-sky-400 ml-1.5" />
          {['en', 'mr', 'hi'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${lang === l
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {l === 'en' ? 'English' : l === 'mr' ? 'मराठी' : 'हिंदी'}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-xs backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Header Banner with Glassmorphism */}
      <div className="ks-glass-hero p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="ks-badge-cyan text-xs">
              {t.statuses[project.status] || project.status}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {project.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Employer: <strong className="text-slate-900 dark:text-white">{project.employerId?.name || 'N/A'}</strong>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Agreed Wage</span>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{userWorkerRecord?.agreedWage || project.paymentAmount}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              per {userWorkerRecord?.wageType || project.paymentType}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs with Glassmorphism Spring Glide */}
      <div className="flex items-center overflow-x-auto pb-2 scrollbar-none">
        <GlassSpringNav
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'overview', key: 'overview', label: t.overview },
            { id: 'attendance', key: 'attendance', label: t.attendance },
            { id: 'progress', key: 'progress', label: t.progress },
            { id: 'extensions', key: 'extensions', label: t.extensions },
            { id: 'payments', key: 'payments', label: t.payments },
            { id: 'reviews', key: 'reviews', label: t.reviews },
          ]}
          variant="glass-light"
          size="md"
          ariaLabel="Project section tabs"
        />
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="ks-glass-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-3">
            {t.overview}
          </h2>

          {/* AI-Powered Project Summary */}
          <AiSummaryCard
            summaryData={summaryData}
            loading={summaryLoading}
            onRefresh={handleRefreshSummary}
            lang={lang}
            type="project"
          />

          {/* Authorized Employer & Site Location Card */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">
                  Authorized Employer Contact & Job Site
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/30 w-fit">
                Confirmed Project Counterparty
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Employer Name</span>
                <span className="font-bold text-slate-900 dark:text-white block truncate">
                  {project.employerId?.name || 'Project Employer'}
                </span>
              </div>

              <div className="p-3 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Direct Phone</span>
                {project.employerId?.phone ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{project.employerId.phone}</span>
                    <a
                      href={`tel:${project.employerId.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0 shadow-xs"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">Provided in Agreement</span>
                )}
              </div>

              <div className="p-3 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Email</span>
                {project.employerId?.email ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{project.employerId.email}</span>
                    <a
                      href={`mailto:${project.employerId.email}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    >
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">Provided in Agreement</span>
                )}
              </div>
            </div>

            {/* Site Address & Directions Button */}
            <div className="p-4 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Work Site Location</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {project.location?.address ||
                      (typeof project.location === 'string' ? project.location : null) ||
                      (project.location?.city ? `${project.location.city}, ${project.location.area || ''}` : 'Job site location')}
                  </p>
                  {project.location?.city && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {project.location.city} {project.location.area ? `• ${project.location.area}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {(() => {
                const lat = project.location?.coordinates?.coordinates?.[1] ?? project.location?.latitude;
                const lng = project.location?.coordinates?.coordinates?.[0] ?? project.location?.longitude;
                const addr = project.location?.address || project.location?.city || (typeof project.location === 'string' ? project.location : '');
                const hasCoords = lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng));
                const destUrl = hasCoords
                  ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                  : addr
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
                    : null;

                if (!destUrl) return null;
                return (
                  <a
                    href={destUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto flex-shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions</span>
                  </a>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Start Date</span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{new Date(project.startDate).toLocaleDateString()}</p>
            </div>
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expected End Date</span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {project.currentExpectedEndDate ? new Date(project.currentExpectedEndDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Original Estimated End</span>
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                {project.originalEstimatedEndDate ? new Date(project.originalEstimatedEndDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="ks-glass-card p-5 space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Overall Progress</span>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Project Completion</span>
              <span className="text-primary dark:text-sky-400 font-extrabold">{project.progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
              <div
                className="bg-gradient-to-r from-primary to-cyan-400 h-full transition-all duration-500"
                style={{ width: `${project.progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="ks-glass-card p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200/80 dark:border-white/10 pb-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.attendance}</h2>
            <span className="ks-badge-cyan text-xs">
              Days Worked: {presentDays}
            </span>
          </div>

          {project.status === 'in_progress' && (
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Today's Shift Status</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {attendance?.checkOut
                    ? 'Check-out completed for today'
                    : attendance?.checkIn
                      ? 'Checked in, shift actively in progress'
                      : 'Not checked in yet today'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!attendance && (
                  <button
                    onClick={handleCheckIn}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                  >
                    <LogIn className="w-4 h-4" /> {t.checkIn}
                  </button>
                )}
                {attendance && !attendance.checkOut && (
                  <button
                    onClick={handleCheckOut}
                    className="ks-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                  >
                    <LogOut className="w-4 h-4" /> {t.checkOut}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Attendance History</h3>
            {attendanceList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No attendance records found.</p>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-white/10 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-slate-900/40">
                {attendanceList.map((a) => (
                  <div key={a._id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{a.date}</span>
                      <span className="ml-3 text-emerald-600 dark:text-emerald-400 font-semibold capitalize">● {a.status}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
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
        <div className="ks-glass-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-3">
            {t.progress}
          </h2>
          <form onSubmit={handleProgressSubmit} className="space-y-4 p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Updated Progress % ({progressForm.percentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progressForm.percentage}
                onChange={(e) => setProgressForm({ ...progressForm, percentage: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.description}</label>
              <textarea
                rows="3"
                value={progressForm.description}
                onChange={(e) => setProgressForm({ ...progressForm, description: e.target.value })}
                placeholder="Describe what work was completed today..."
                className="ks-glass-input w-full p-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tasks Completed (comma-separated)</label>
              <input
                type="text"
                value={progressForm.tasksCompletedStr}
                onChange={(e) => setProgressForm({ ...progressForm, tasksCompletedStr: e.target.value })}
                placeholder="e.g. Wall plastering, Tile fitting"
                className="ks-glass-input w-full p-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Blockers / Delays (comma-separated)</label>
              <input
                type="text"
                value={progressForm.blockersStr}
                onChange={(e) => setProgressForm({ ...progressForm, blockersStr: e.target.value })}
                placeholder="e.g. Material delivery delayed, Rain"
                className="ks-glass-input w-full p-2.5 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="ks-btn-primary px-5 py-2.5 text-xs font-bold"
            >
              {todayProgress ? t.updateProgress : t.saveProgress}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: EXTENSIONS (The previously affected section) */}
      {activeTab === 'extensions' && (
        <div className="ks-glass-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-3">
            {t.extensions}
          </h2>

          {/* Request Form */}
          <form onSubmit={handleExtensionSubmit} className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary dark:text-sky-400" /> {t.requestExtension}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.requestedEndDate}
                </label>
                <input
                  type="date"
                  value={extForm.requestedEndDate}
                  onChange={(e) => setExtForm({ ...extForm, requestedEndDate: e.target.value })}
                  className="ks-glass-input w-full p-2.5 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.proposedWage}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={extForm.proposedWage}
                  onChange={(e) => setExtForm({ ...extForm, proposedWage: e.target.value })}
                  className="ks-glass-input w-full p-2.5 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.reason}
              </label>
              <textarea
                rows="2"
                placeholder="State the reason for duration extension..."
                value={extForm.reason}
                onChange={(e) => setExtForm({ ...extForm, reason: e.target.value })}
                className="ks-glass-input w-full p-2.5 text-xs"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Request</span>
            </button>
          </form>

          {/* Extension Requests List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Extension History</h3>
            {extensions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.noExtensions}</p>
            ) : (
              <div className="space-y-3">
                {extensions.map((ext) => (
                  <div key={ext._id} className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Requested End: {new Date(ext.requestedEndDate).toLocaleDateString()}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${ext.status === 'approved' ? 'ks-badge-emerald' :
                          ext.status === 'rejected' ? 'ks-badge-rose' :
                            'ks-badge-amber'
                        }`}>
                        {ext.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">Reason: {ext.reason}</p>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex gap-4 pt-1">
                      <span>Worker Approval: <strong className="capitalize text-slate-900 dark:text-white">{ext.workerApproval}</strong></span>
                      <span>Employer Approval: <strong className="capitalize text-slate-900 dark:text-white">{ext.employerApproval}</strong></span>
                    </div>

                    {ext.status === 'pending' && ext.workerApproval === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                        <button
                          onClick={() => handleApproveExtension(ext._id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                        >
                          {t.approve}
                        </button>
                        <button
                          onClick={() => handleRejectExtension(ext._id)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
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
        <div className="ks-glass-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-3">
            {t.payments}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.expectedAmount}</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹{expectedTotal.toLocaleString()}</p>
            </div>
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.paidAmount}</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹{totalPaidAmount.toLocaleString()}</p>
            </div>
            <div className="ks-glass-card p-4 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.pendingAmount}</span>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.paymentHistory}</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.noPayments}</p>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-white/10 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-slate-900/40">
                {payments.map((p) => (
                  <div key={p._id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">₹{p.amount}</span>
                      <span className="ml-2 text-slate-600 dark:text-slate-400 capitalize">({p.type} - {p.method})</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{new Date(p.paymentDate).toLocaleDateString()}</p>
                    </div>
                    <span className="ks-badge-emerald text-[10px]">
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
        <div className="ks-glass-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-3">
            {t.reviews}
          </h2>

          {/* Project Completed Banner */}
          {['completed', 'closed'].includes(project.status) ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-lg">
                <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> {t.projectCompletedBadge}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                This project is complete! You can leave a review and rating for your employer below.
              </p>

              {/* Review Form */}
              <form onSubmit={handleReviewSubmit} className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-emerald-500/20 space-y-3 mt-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.rateEmployer}</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.rating} (1 - 5 Stars)</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - Good)</option>
                    <option value="3">⭐⭐⭐ (3 - Average)</option>
                    <option value="2">⭐⭐ (2 - Below Average)</option>
                    <option value="1">⭐ (1 - Poor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.comment}</label>
                  <textarea
                    rows="3"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your experience working with this employer..."
                    className="ks-glass-input w-full p-2.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ks-btn-primary px-5 py-2 text-xs font-bold"
                >
                  {t.submitReview}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
              Reviews can be submitted once the project status is set to <strong className="text-slate-900 dark:text-white">Completed</strong>.
            </div>
          )}

          {/* Published Reviews List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Project Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.noReviews}</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev._id} className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {rev.reviewerId?.name || 'Participant'} ({rev.reviewerRole})
                      </span>
                      <span className="text-amber-500 font-bold text-xs flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {rev.rating} / 5
                      </span>
                    </div>
                    {rev.comment && <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{rev.comment}"</p>}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
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
