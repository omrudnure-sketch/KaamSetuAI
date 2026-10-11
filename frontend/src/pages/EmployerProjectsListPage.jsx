import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployerProjects } from '../services/projectService.js';
import { Briefcase, Users, Building, DollarSign, Calendar, Clock, AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';

export const EmployerProjectsListPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getEmployerProjects();
        if (res.success) {
          setProjects(res.data || []);
        } else {
          setError(res.error?.message || 'Failed to load projects');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'in_progress':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'completion_requested':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'cancelled':
      case 'closed':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-primary" />
          <span>Employer Projects</span>
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          Monitor active projects, multi-worker attendance, daily progress, and project completion
        </p>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-white border border-rose-200 rounded-2xl text-center text-rose-700 space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-3 shadow-sm">
          <Briefcase className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-900">No active projects created yet.</p>
          <p className="text-xs text-slate-500">
            Confirm a hiring agreement with a worker to automatically initiate a project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Link
              key={project._id}
              to={`/employer/projects/${project._id}`}
              className="block bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(project.status)}`}>
                      {project.status.toUpperCase()}
                    </span>
                    {project.jobId?.title && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Job: {project.jobId.title}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-500" /> Assigned Workers: <strong className="text-slate-900">{project.workers?.length || 1}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start: {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2 max-w-md">
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-600">Overall Progress</span>
                      <span className="text-primary font-extrabold">{project.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${project.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Payment</span>
                    <p className="text-xl font-extrabold text-emerald-700">₹{project.paymentAmount}</p>
                    <span className="text-[10px] text-slate-500">per {project.paymentType}</span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
