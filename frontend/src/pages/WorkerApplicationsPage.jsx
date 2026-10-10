import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerApplications, withdrawApplication } from '../services/applicationService.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import { Globe, Briefcase, Building, DollarSign, Clock, AlertCircle, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

export const WorkerApplicationsPage = () => {
  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getWorkerApplications();
      if (res.success) {
        setApplications(res.data);
      } else {
        setError(res.error?.message || 'Failed to load applications');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      setActionMessage('');
      const res = await withdrawApplication(id);
      if (res.success) {
        setActionMessage('Application withdrawn successfully');
        fetchApplications();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to withdraw application');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'shortlisted':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'selected':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'withdrawn':
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
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
            <Briefcase className="w-7 h-7 text-cyan-400" />
            <span>{t.myApplications}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.applicationsSubtitle}</p>
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

      {actionMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-medium">Loading applications...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-slate-850 border border-slate-800 rounded-2xl text-center text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="w-full p-12 bg-slate-850 border border-slate-800 rounded-2xl text-center text-slate-400 space-y-4">
          <Briefcase className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-base font-semibold">{t.noApplications}</p>
          <Link
            to="/worker/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 text-xs font-extrabold rounded-xl hover:bg-cyan-400 transition-all"
          >
            Browse Available Jobs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(app.status)}`}>
                      {t.statuses[app.status] || app.status}
                    </span>
                    {app.jobId?.skillRequired && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {app.jobId.skillRequired}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {app.jobId?.title || 'Job Title Unavailable'}
                  </h3>
                  {app.employerId?.name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Building className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Employer: <strong>{app.employerId.name}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">{t.proposedWage}</span>
                    <p className="text-xl font-extrabold text-emerald-400">₹{app.proposedWage}</p>
                  </div>

                  {(app.status === 'pending' || app.status === 'shortlisted') && (
                    <button
                      onClick={() => handleWithdraw(app._id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all"
                      title="Withdraw Application"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.withdraw}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Applied: {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  {app.message && (
                    <span className="text-slate-300 italic max-w-md truncate">
                      "{app.message}"
                    </span>
                  )}
                </div>

                {app.status === 'selected' && (
                  <Link
                    to="/worker/hiring"
                    className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    View Hiring Status <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
