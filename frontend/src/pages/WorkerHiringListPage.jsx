import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerHiringAgreements } from '../services/hiringService.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import { Globe, FileCheck, Building, DollarSign, Calendar, Clock, AlertCircle, ChevronRight, ShieldCheck } from 'lucide-react';

export const WorkerHiringListPage = () => {
  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getWorkerHiringAgreements();
        if (res.success) {
          setAgreements(res.data);
        } else {
          setError(res.error?.message || 'Failed to load hiring agreements');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load hiring agreements');
      } finally {
        setLoading(false);
      }
    };
    fetchAgreements();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'pending_worker':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'pending_employer':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'negotiation':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'rejected':
      case 'cancelled':
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
            <FileCheck className="w-7 h-7 text-cyan-400" />
            <span>{t.hiringAgreements}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.hiringSubtitle}</p>
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
          <p className="text-slate-400 text-sm font-medium">Loading hiring agreements...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-slate-850 border border-slate-800 rounded-2xl text-center text-rose-400 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : agreements.length === 0 ? (
        <div className="w-full p-12 bg-slate-850 border border-slate-800 rounded-2xl text-center text-slate-400 space-y-4">
          <FileCheck className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-base font-semibold">{t.noAgreements}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((agr) => (
            <Link
              key={agr._id}
              to={`/worker/hiring/${agr._id}`}
              className="block bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 transition-all shadow-md group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(agr.status)}`}>
                      {t.statuses[agr.status] || agr.status}
                    </span>
                    {agr.status === 'confirmed' && (
                      <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> Confirmed
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {agr.jobId?.title || 'Job Title Unavailable'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {agr.employerId?.name && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-cyan-400" /> Employer: <strong>{agr.employerId.name}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Start: {new Date(agr.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">
                      {agr.status === 'confirmed' ? t.agreedWage : t.proposedWage}
                    </span>
                    <p className="text-xl font-extrabold text-emerald-400">
                      ₹{agr.status === 'confirmed' ? agr.agreedWage : agr.proposedWage}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {t.wageTypes[agr.wageType] || agr.wageType}
                    </span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
