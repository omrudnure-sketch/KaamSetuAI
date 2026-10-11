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
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-600 text-sm">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl space-y-4 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Unable to display job</h2>
        <p className="text-slate-600 text-sm">{error || 'Job not found'}</p>
        <Link to="/employer/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm rounded-xl font-semibold border border-slate-200">
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Jobs</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/employer/jobs/${job._id}/applications`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-extrabold rounded-xl transition-all shadow-md"
          >
            <UsersRound className="w-4 h-4" />
            <span>View Applications</span>
          </Link>

          <Link
            to={`/employer/jobs/${job._id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl transition-all border border-slate-200"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Job</span>
          </Link>

          {job.status === 'open' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold rounded-xl border border-rose-200 transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>{closing ? 'Closing...' : 'Close Job'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-md">
                {job.skillRequired}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md ${
                job.status === 'open' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{job.title}</h1>
            <p className="text-xs text-slate-500 mt-1">Posted on {new Date(job.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-right sm:text-right">
            <p className="text-xs text-slate-600 uppercase font-semibold">Offered Wage</p>
            <p className="text-2xl font-extrabold text-emerald-700">₹{job.wageAmount}</p>
            <p className="text-xs text-slate-600">{job.wageType} wage</p>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1"><Users className="w-3.5 h-3.5 text-amber-700" /> Workers</span>
            <span className="font-bold text-slate-900">{job.workersRequired} required</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5 text-rose-600" /> Location</span>
            <span className="font-bold text-slate-900">{job.location?.city || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5 text-blue-600" /> Duration</span>
            <span className="font-bold text-slate-900 capitalize">{job.durationType.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-purple-600" /> Start Date</span>
            <span className="font-bold text-slate-900">{new Date(job.startDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Job Description</h3>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
        </div>

        {/* Location Details */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Location Details</h3>
          <p className="text-slate-700 text-sm">
            <strong className="text-slate-900">City & Area:</strong> {job.location?.city || ''}{job.location?.area ? `, ${job.location.area}` : ''}
          </p>
          {job.location?.address && (
            <p className="text-slate-600 text-sm">
              <strong className="text-slate-900">Address:</strong> {job.location.address}
            </p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Working Hours</h3>
            <p className="text-slate-700 text-sm">
              {job.workingHours?.start} - {job.workingHours?.end}
            </p>
            {job.workingHours?.description && (
              <p className="text-slate-600 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs rounded-lg border border-slate-200 font-medium">
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
