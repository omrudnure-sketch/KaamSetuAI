import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerProjects } from '../services/projectService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { Globe, HardHat, Building, DollarSign, Calendar, Clock, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';

export const WorkerProjectsListPage = () => {
  const [lang, setLang] = useState('en');
  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const [projectWorkers, setProjectWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getWorkerProjects();
        if (res.success) {
          setProjectWorkers(res.data || []);
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
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'cancelled':
      case 'closed':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Building className="w-7 h-7 text-primary" />
            <span>{t.projects}</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">{t.myProjectsSubtitle}</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs self-start sm:self-auto">
          <Globe className="w-4 h-4 text-primary ml-1.5" />
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : projectWorkers.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-3 shadow-sm">
          <Building className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-800">{t.noProjects}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projectWorkers.map((pw) => {
            const project = pw.projectId;
            if (!project) return null;
            return (
              <Link
                key={pw._id}
                to={`/worker/projects/${project._id}`}
                className="block bg-white border border-slate-200 hover:border-primary/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(project.status)}`}>
                        {t.statuses[project.status] || project.status}
                      </span>
                      {project.jobId?.skillRequired && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {project.jobId.skillRequired}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      {project.employerId?.name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-primary" /> Employer: <strong className="text-slate-800">{project.employerId.name}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Start: {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-600">{t.overallProgress}</span>
                        <span className="text-primary font-extrabold">{project.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-gradient-to-r from-primary to-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${project.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Agreed Wage</span>
                      <p className="text-xl font-extrabold text-emerald-700">₹{pw.agreedWage}</p>
                      <span className="text-[10px] text-slate-500">per {pw.wageType}</span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
