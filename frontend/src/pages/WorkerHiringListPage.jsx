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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'pending_worker':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'pending_employer':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'negotiation':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'rejected':
      case 'cancelled':
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
            <FileCheck className="w-7 h-7 text-primary" />
            <span>{t.hiringAgreements}</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">{t.hiringSubtitle}</p>
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
          <p className="text-slate-600 text-sm font-medium">Loading hiring agreements...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : agreements.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-4 shadow-sm">
          <FileCheck className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-800">{t.noAgreements}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((agr) => (
            <Link
              key={agr._id}
              to={`/worker/hiring/${agr._id}`}
              className="block bg-white border border-slate-200 hover:border-primary/50 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(agr.status)}`}>
                      {t.statuses[agr.status] || agr.status}
                    </span>
                    {agr.status === 'confirmed' && (
                      <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" /> Confirmed
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {agr.jobId?.title || 'Job Title Unavailable'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    {agr.employerId?.name && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-primary" /> Employer: <strong className="text-slate-800">{agr.employerId.name}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Start: {new Date(agr.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">
                      {agr.status === 'confirmed' ? t.agreedWage : t.proposedWage}
                    </span>
                    <p className="text-xl font-extrabold text-emerald-700">
                      ₹{agr.status === 'confirmed' ? agr.agreedWage : agr.proposedWage}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {t.wageTypes[agr.wageType] || agr.wageType}
                    </span>
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
