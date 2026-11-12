import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployerJobById, closeJob } from '../services/jobApi.js';
import {
  Briefcase,
  ArrowLeft,
  Edit3,
  XCircle,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  AlertCircle,
  UsersRound,
  Sparkles,
  Building,
} from 'lucide-react';
import { RecommendedWorkersSection } from '../components/RecommendedWorkersSection.jsx';

export const EmployerJobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getEmployerJobById(id);
        if (res?.success && res.data) {
          setJob(res.data);
        } else {
          setError(res?.error?.message || 'Job not found');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this job?')) return;
    try {
      setClosing(true);
      const res = await closeJob(id);
      if (res?.success) {
        setJob((prev) => ({ ...prev, status: 'closed' }));
      } else {
        alert(res?.error?.message || 'Failed to close job');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error closing job');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-16 text-center ks-glass-card my-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 ks-glass-card my-6 border-rose-500/30 space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unable to display job</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{error || 'Job not found'}</p>
        <Link to="/employer/jobs" className="ks-btn-outline inline-flex items-center gap-2 px-4 py-2 text-xs font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to My Jobs
        </Link>
      </div>
    );
  }

  const skillName = job.skillRequired || job.category || (Array.isArray(job.requiredSkills) ? job.requiredSkills[0] : 'General Work');
  const statusStr = job.status || 'open';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 pt-2">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Link
          to={`/employer/jobs/${job.id || job._id}/applications`}
          className="ks-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold shadow-xs"
        >
            <UsersRound className="w-4 h-4" />
            <span>View Applications</span>
          </Link>

          <Link
            to={`/employer/jobs/${job.id || job._id}/edit`}
            className="ks-btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Job</span>
          </Link>

          {statusStr === 'open' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>{closing ? 'Closing...' : 'Close Job'}</span>
            </button>
          )}
        </div>

      {/* Main Detail Card */}
      <div className="ks-glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ks-badge-cyan text-xs capitalize">
                {skillName}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                statusStr === 'open' ? 'ks-badge-emerald' : 'ks-badge-rose'
              }`}>
                {statusStr}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{job.title || 'Untitled Job'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Posted on {job.createdAt && !isNaN(new Date(job.createdAt).getTime()) ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 text-left sm:text-right">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Offered Wage</p>
            <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">₹{job.wageAmount ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{(job.wageType || 'daily')} wage</p>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-amber-500" /> Workers
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{job.workersRequired || job.workersNeeded || 1} required</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Location
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate block">
              {typeof job.location === 'object'
                ? (job.location?.city || job.location?.area || 'N/A')
                : (job.location || 'N/A')}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Duration
            </span>
            <span className="font-bold text-slate-900 dark:text-white capitalize">
              {job.durationType
                ? String(job.durationType).replace(/_/g, ' ')
                : (job.durationDays ? `${job.durationDays} Days` : 'Fixed Term')}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-violet-400" /> Start Date
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {job.startDate && !isNaN(new Date(job.startDate).getTime())
                ? new Date(job.startDate).toLocaleDateString()
                : 'Immediate'}
            </span>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Job Description</h3>
          <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line">{job.description || 'No description provided.'}</p>
        </div>

        {/* Location Details */}
        <div className="space-y-2 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location Details</h3>
          <p className="text-slate-700 dark:text-slate-300 text-sm">
            <strong className="text-slate-900 dark:text-white">City & Area:</strong>{' '}
            {typeof job.location === 'object'
              ? `${job.location?.city || ''}${job.location?.area ? `, ${job.location.area}` : ''}` || 'Not specified'
              : (job.location || 'Not specified')}
          </p>
          {typeof job.location === 'object' && job.location?.address && (
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              <strong className="text-slate-900 dark:text-white">Address:</strong> {job.location.address}
            </p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Working Hours</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              {typeof job.workingHours === 'object' && job.workingHours?.start && job.workingHours?.end
                ? `${job.workingHours.start} - ${job.workingHours.end}`
                : (typeof job.workingHours === 'string' ? job.workingHours : '09:00 - 18:00 (Standard Shift)')}
            </p>
            {typeof job.workingHours === 'object' && job.workingHours?.description && (
              <p className="text-slate-500 dark:text-slate-400 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-medium">
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Workers Section */}
      <RecommendedWorkersSection job={job} />
    </div>
  );
};

export default EmployerJobDetailPage;
