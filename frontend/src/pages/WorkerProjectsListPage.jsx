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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'confirmed':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'completion_requested':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'cancelled':
      case 'closed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Building className="w-7 h-7 text-cyan-400" />
            <span>{t.projects}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.myProjectsSubtitle}</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start sm:self-auto">
          <Globe className="w-4 h-4 text-cyan-400 ml-1.5" />
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-medium">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-slate-850 border border-slate-800 rounded-2xl text-center text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : projectWorkers.length === 0 ? (
        <div className="w-full p-12 bg-slate-850 border border-slate-800 rounded-2xl text-center text-slate-400 space-y-3">
          <Building className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-base font-semibold">{t.noProjects}</p>
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
                className="block bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 transition-all shadow-md group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(project.status)}`}>
                        {t.statuses[project.status] || project.status}
                      </span>
                      {project.jobId?.skillRequired && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {project.jobId.skillRequired}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      {project.employerId?.name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-cyan-400" /> Employer: <strong>{project.employerId.name}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Start: {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-400">{t.overallProgress}</span>
                        <span className="text-cyan-400 font-extrabold">{project.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500"
                          style={{ width: `${project.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Agreed Wage</span>
                      <p className="text-xl font-extrabold text-emerald-400">₹{pw.agreedWage}</p>
                      <span className="text-[10px] text-slate-400">per {pw.wageType}</span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
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
