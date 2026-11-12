import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerProjects } from '../services/projectService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Globe, Building, Calendar, AlertCircle, ChevronRight, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';

export const WorkerProjectsListPage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const [projectWorkers, setProjectWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    if (user && user.role !== 'worker') {
      setLoading(false);
      return;
    }

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
      const msg = err.response?.data?.error?.message;
      if (err.response?.status === 403 || msg?.toLowerCase().includes('worker roles')) {
        setError('Projects list is restricted to registered worker accounts.');
      } else {
        setError(msg || 'Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user?.role]);

  // If user is not a worker, show friendly role restriction card
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
            You are signed in as a <strong className="text-slate-900 dark:text-white">{currentUserLabel}</strong>. Worker projects can only be viewed by worker accounts.
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return <span className="ks-badge-emerald text-xs">{t.statuses[status] || status}</span>;
      case 'confirmed':
        return <span className="ks-badge-cyan text-xs">{t.statuses[status] || status}</span>;
      case 'completion_requested':
        return <span className="ks-badge-amber text-xs">{t.statuses[status] || status}</span>;
      case 'completed':
        return <span className="ks-badge-purple text-xs">{t.statuses[status] || status}</span>;
      case 'cancelled':
      case 'closed':
        return <span className="ks-badge-rose text-xs">{t.statuses[status] || status}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{t.statuses[status] || status}</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>{t.projects}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">{t.myProjectsSubtitle}</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs self-start sm:self-auto">
          <Globe className="w-4 h-4 text-primary dark:text-sky-400 ml-1.5" />
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center ks-glass-card">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 ks-glass-card border-rose-500/30 text-center text-rose-600 dark:text-rose-400 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={fetchProjects}
            className="ks-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : projectWorkers.length === 0 ? (
        <div className="w-full p-12 ks-glass-card text-center text-slate-600 dark:text-slate-400 space-y-3">
          <Building className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">{t.noProjects}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Once an employer confirms your hiring agreement, active projects will be tracked here.
          </p>
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
                className="block ks-glass-card-hover p-5 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(project.status)}
                      {project.jobId?.skillRequired && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 px-2.5 py-0.5 rounded-lg">
                          {project.jobId.skillRequired}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                      {project.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      {project.employerId?.name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-primary dark:text-sky-400" /> Employer: <strong className="text-slate-900 dark:text-white">{project.employerId.name}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start: {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-400">{t.overallProgress}</span>
                        <span className="text-primary dark:text-sky-400 font-extrabold">{project.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                        <div
                          className="bg-gradient-to-r from-primary to-cyan-400 h-full transition-all duration-500"
                          style={{ width: `${project.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 dark:border-white/10">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Agreed Wage</span>
                      <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{pw.agreedWage}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">per {pw.wageType}</span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary dark:group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
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

export default WorkerProjectsListPage;
