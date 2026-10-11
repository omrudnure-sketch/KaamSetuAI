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
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Open</span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">Closed</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Paused</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Cancelled</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">Completed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Posted Jobs</h1>
            <p className="text-slate-600 text-sm">Create, manage, and monitor your job postings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employer/workers/map"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl transition-all shadow-sm"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>Worker Map</span>
          </Link>
          <Link
            to="/employer/jobs/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading your job postings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-600" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchJobs}
            className="px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No jobs posted yet</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            You haven't created any job postings yet. Click the button below to publish your first requirement.
          </p>
          <Link
            to="/employer/jobs/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all"
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
              className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-md mb-1.5">
                      {job.skillRequired}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <p className="text-slate-600 text-sm line-clamp-2">{job.description}</p>

                {/* Job Metadata Icons */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700">₹{job.wageAmount}</span>
                    <span className="text-slate-500">/{job.wageType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-700" />
                    <span>{job.workersRequired} worker(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span className="truncate">{job.location?.city || 'N/A'}{job.location?.area ? `, ${job.location.area}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{new Date(job.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <Link
                  to={`/employer/jobs/${job._id}/applications`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <UsersRound className="w-3.5 h-3.5" />
                  <span>Applications</span>
                </Link>

                <Link
                  to={`/employer/jobs/${job._id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </Link>

                {job.status === 'open' && (
                  <button
                    onClick={() => handleCloseJob(job._id, job.title)}
                    disabled={closingId === job._id}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-all disabled:opacity-50"
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
