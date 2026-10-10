import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmployerJobs, closeJob } from '../services/jobApi.js';
import { Briefcase, Plus, Calendar, MapPin, Users, DollarSign, Clock, AlertCircle, Edit3, XCircle, Eye, UsersRound } from 'lucide-react';

export const EmployerJobsPage = () => {
  const navigate = useNavigate();
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
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Open</span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Closed</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Paused</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Cancelled</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Completed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-850 p-6 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Posted Jobs</h1>
            <p className="text-slate-400 text-sm">Create, manage, and monitor your job postings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employer/workers/map"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold rounded-xl transition-all"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>Worker Map</span>
          </Link>
          <Link
            to="/employer/jobs/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-medium">Loading your job postings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchJobs}
            className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No jobs posted yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You haven't created any job postings yet. Click the button below to publish your first requirement.
          </p>
          <Link
            to="/employer/jobs/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
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
              className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-md mb-1.5">
                      {job.skillRequired}
                    </span>
                    <h3 className="text-lg font-bold text-white line-clamp-1">{job.title}</h3>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <p className="text-slate-400 text-sm line-clamp-2">{job.description}</p>

                {/* Job Metadata Icons */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400">₹{job.wageAmount}</span>
                    <span className="text-slate-500">/{job.wageType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>{job.workersRequired} worker(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span className="truncate">{job.location?.city || 'N/A'}{job.location?.area ? `, ${job.location.area}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{new Date(job.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 gap-2">
                <Link
                  to={`/employer/jobs/${job._id}/applications`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all"
                >
                  <UsersRound className="w-3.5 h-3.5" />
                  <span>Applications</span>
                </Link>

                <Link
                  to={`/employer/jobs/${job._id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </Link>

                {job.status === 'open' && (
                  <button
                    onClick={() => handleCloseJob(job._id, job.title)}
                    disabled={closingId === job._id}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20 transition-all disabled:opacity-50"
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
