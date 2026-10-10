import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployerJobById, closeJob } from '../services/jobApi.js';
import { Briefcase, ArrowLeft, Edit3, XCircle, MapPin, DollarSign, Calendar, Clock, Users, ShieldCheck, AlertCircle, UsersRound } from 'lucide-react';
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
        if (res.success && res.data) {
          setJob(res.data);
        } else {
          setError(res.error?.message || 'Job not found');
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
      if (res.success) {
        setJob((prev) => ({ ...prev, status: 'closed' }));
      } else {
        alert(res.error?.message || 'Failed to close job');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error closing job');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-850 border border-slate-800 rounded-2xl space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Unable to display job</h2>
        <p className="text-slate-400 text-sm">{error || 'Job not found'}</p>
        <Link to="/employer/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to My Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/employer/jobs')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Jobs</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/employer/jobs/${job._id}/applications`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all shadow-md"
          >
            <UsersRound className="w-4 h-4" />
            <span>View Applications</span>
          </Link>

          <Link
            to={`/employer/jobs/${job._id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-400 text-sm font-bold rounded-xl transition-all border border-slate-700"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Job</span>
          </Link>

          {job.status === 'open' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-bold rounded-xl border border-rose-500/20 transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>{closing ? 'Closing...' : 'Close Job'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-md">
                {job.skillRequired}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md ${
                job.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{job.title}</h1>
            <p className="text-xs text-slate-500 mt-1">Posted on {new Date(job.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-right sm:text-right">
            <p className="text-xs text-slate-400 uppercase font-semibold">Offered Wage</p>
            <p className="text-2xl font-extrabold text-emerald-400">₹{job.wageAmount}</p>
            <p className="text-xs text-slate-400">{job.wageType} wage</p>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm">
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Users className="w-3.5 h-3.5 text-amber-400" /> Workers</span>
            <span className="font-bold text-white">{job.workersRequired} required</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> Location</span>
            <span className="font-bold text-white">{job.location?.city || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5 text-blue-400" /> Duration</span>
            <span className="font-bold text-white capitalize">{job.durationType.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-purple-400" /> Start Date</span>
            <span className="font-bold text-white">{new Date(job.startDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Job Description</h3>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
        </div>

        {/* Location Details */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Location Details</h3>
          <p className="text-slate-300 text-sm">
            <strong className="text-slate-200">City & Area:</strong> {job.location?.city || ''}{job.location?.area ? `, ${job.location.area}` : ''}
          </p>
          {job.location?.address && (
            <p className="text-slate-300 text-sm">
              <strong className="text-slate-200">Address:</strong> {job.location.address}
            </p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Working Hours</h3>
            <p className="text-slate-300 text-sm">
              {job.workingHours?.start} - {job.workingHours?.end}
            </p>
            {job.workingHours?.description && (
              <p className="text-slate-400 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Workers Section (Step 22) */}
      <RecommendedWorkersSection job={job} />
    </div>
  );
};
