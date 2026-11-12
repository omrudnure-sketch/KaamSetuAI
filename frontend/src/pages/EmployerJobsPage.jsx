import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployerJobs, closeJob } from '../services/jobApi.js';
import { Briefcase, Plus, Calendar, MapPin, Users, DollarSign, Clock, AlertCircle, Eye, UsersRound, XCircle, Search } from 'lucide-react';

export const EmployerJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closingId, setClosingId] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getEmployerJobs();
      if (res.success) {
        setJobs(res.data || []);
      } else {
        setError(res.error?.message || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCloseJob = async (jobId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to close "${jobTitle}"? Closed jobs will no longer appear to workers.`)) {
      return;
    }

    try {
      setClosingId(jobId);
      const res = await closeJob(jobId);
      if (res.success) {
        setJobs((prev) => prev.map((j) => (j._id === jobId ? { ...j, status: 'closed' } : j)));
      } else {
        alert(res.error?.message || 'Failed to close job');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Error closing job');
    } finally {
      setClosingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="ks-badge-emerald text-xs">Open</span>;
      case 'closed':
        return <span className="ks-badge-rose text-xs">Closed</span>;
      case 'paused':
        return <span className="ks-badge-amber text-xs">Paused</span>;
      case 'completed':
        return <span className="ks-badge-cyan text-xs">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 py-2">
      {/* Header Bar with Glass Hero */}
      <div className="ks-glass-hero p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary dark:text-sky-400">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">My Posted Jobs</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Create, manage, and monitor your hiring listings</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/employer/workers/map"
            className="ks-btn-outline inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold"
          >
            <MapPin className="w-4 h-4 text-primary dark:text-sky-400" />
            <span>Worker Map</span>
          </Link>
          <Link
            to="/employer/jobs/create"
            className="ks-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center ks-glass-card">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading your job postings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 ks-glass-card border-rose-500/30 flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchJobs}
            className="ks-btn-outline px-4 py-1.5 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="p-12 text-center ks-glass-card space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary dark:text-sky-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No jobs posted yet</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            You haven't created any job postings yet. Click the button below to publish your first requirement with AI assistance.
          </p>
          <Link
            to="/employer/jobs/create"
            className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Job</span>
          </Link>
        </div>
      )}

      {/* Jobs List Grid */}
      {!loading && !error && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="ks-glass-card-hover p-6 space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="ks-badge-cyan text-xs capitalize inline-block mb-1.5">
                      {job.skillRequired}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                      {job.title}
                    </h3>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Job Metadata Icons */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-3 border-t border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{job.wageAmount}</span>
                    <span className="text-slate-500 dark:text-slate-400">/{job.wageType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>{job.workersRequired} worker(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="truncate">{job.location?.city || 'N/A'}{job.location?.area ? `, ${job.location.area}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary dark:text-sky-400" />
                    <span>{new Date(job.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 gap-2">
                <Link
                  to={`/employer/jobs/${job._id}/applications`}
                  className="ks-btn-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold"
                >
                  <UsersRound className="w-3.5 h-3.5" />
                  <span>Applications</span>
                </Link>

                <Link
                  to={`/employer/jobs/${job._id}`}
                  className="ks-btn-outline inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </Link>

                {job.status === 'open' && (
                  <button
                    onClick={() => handleCloseJob(job._id, job.title)}
                    disabled={closingId === job._id}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{closingId === job._id ? 'Closing...' : 'Close Job'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerJobsPage;
