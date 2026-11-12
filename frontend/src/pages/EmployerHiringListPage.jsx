import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployerHiringAgreements } from '../services/hiringService.js';
import {
  FileCheck,
  Users,
  Calendar,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

export const EmployerHiringListPage = () => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getEmployerHiringAgreements();
        if (res?.success && Array.isArray(res?.data)) {
          setAgreements(res.data);
        } else {
          setError(res?.error?.message || 'Failed to load hiring agreements');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load hiring agreements');
      } finally {
        setLoading(false);
      }
    };
    fetchAgreements();
  }, []);

  const getStatusBadgeClass = (status = '') => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'ks-badge-emerald';
      case 'pending_employer':
      case 'pending_worker':
        return 'ks-badge-amber';
      case 'negotiation':
        return 'ks-badge-violet';
      case 'rejected':
      case 'cancelled':
        return 'ks-badge-rose';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="ks-badge-cyan">
                <Sparkles className="w-3.5 h-3.5" /> Direct Contracts
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-7 h-7 text-primary dark:text-sky-400" />
              <span>Hiring Agreements</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Track wage proposals, negotiations, and formal contract milestones with hired workers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/employer/workers" className="ks-btn-outline text-xs px-4 py-2 font-bold">
              Find More Workers
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full p-12 text-center ks-glass-card">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading hiring agreements...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 ks-glass-card border-rose-500/30 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-semibold text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      ) : agreements.length === 0 ? (
        <div className="w-full p-12 ks-glass-card text-center space-y-4">
          <FileCheck className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hiring agreements initiated yet</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            When you select applicants or directly invite candidates to a job, formal agreements will appear here.
          </p>
          <div className="pt-2">
            <Link to="/employer/workers" className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>Browse Available Workers</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((agr) => {
            const statusStr = agr?.status || 'pending';
            const startDateStr = agr?.startDate ? new Date(agr.startDate).toLocaleDateString() : 'Immediate';
            return (
              <Link
                key={agr._id}
                to={`/employer/hiring/${agr._id}`}
                className="block ks-glass-card hover:border-primary/50 dark:hover:border-sky-500/50 p-5 transition-all group hover:scale-[1.005]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(statusStr)}`}>
                        {statusStr.toUpperCase()}
                      </span>
                      {statusStr.toLowerCase() === 'confirmed' && (
                        <span className="ks-badge-emerald flex items-center gap-1 text-[11px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Confirmed
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                      {agr.jobId?.title || 'Job Opportunity'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      {agr.workerId?.name && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
                          <span>Worker:</span>
                          <strong className="text-slate-900 dark:text-white">{agr.workerId.name}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Start: {startDateStr}</span>
                      </span>
                      {agr.durationDays && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{agr.durationDays} days</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 dark:border-white/10">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        {statusStr.toLowerCase() === 'confirmed' ? 'Agreed Wage' : 'Proposed Wage'}
                      </span>
                      <p className="text-xl font-black text-emerald-500 dark:text-emerald-400">
                        ₹{statusStr.toLowerCase() === 'confirmed' ? (agr.agreedWage ?? agr.proposedWage ?? 0) : (agr.proposedWage ?? 0)}
                      </p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                        {agr.wageType || 'daily'}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-primary dark:group-hover:text-sky-400 group-hover:border-primary/40 dark:group-hover:border-sky-500/40 transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
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

export default EmployerHiringListPage;
