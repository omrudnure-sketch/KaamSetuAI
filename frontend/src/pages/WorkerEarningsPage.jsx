import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerPayments, getWorkerEarningsSummary } from '../services/paymentService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const WorkerEarningsPage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const fetchEarningsData = async () => {
    if (user && user.role !== 'worker') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [sumRes, payRes] = await Promise.all([
        getWorkerEarningsSummary(),
        getWorkerPayments(),
      ]);
      setSummary(sumRes?.data || { totalEarnings: 0, thisMonth: 0, thisWeek: 0, pending: 0 });
      setPayments(Array.isArray(payRes?.data) ? payRes.data : []);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to load earnings data';
      console.warn('[KaamSetu AI Payments] Diagnostic:', {
        status: err.response?.status,
        url: err.config?.url,
        message: errorMsg,
      });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [user]);

  // Role Access Restriction Guard
  if (user && user.role !== 'worker') {
    const dashboardLink = user.role === 'employer' ? '/employer' : user.role === 'admin' ? '/admin' : '/';
    const roleLabel = user.role === 'employer' ? 'Employer' : user.role === 'admin' ? 'Administrator' : 'Guest';

    return (
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <div className="ks-glass-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            This page is available to workers only
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You are currently signed in with a <strong className="capitalize text-slate-900 dark:text-white">{roleLabel}</strong> account. Earnings and wage history are designated for registered workers.
          </p>
          <div className="pt-2">
            <Link
              to={dashboardLink}
              className="ks-btn-primary text-xs"
            >
              <span>Go to {roleLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-headline-md">
              {t.payments}
            </h1>
            <span className="ks-badge-cyan text-[10px]">Verified Ledger</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            {t.myProjectsSubtitle} • पारदर्शक हिशोब व देयके
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-full ks-glass-card">
          {['en', 'mr', 'hi'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                lang === l
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {l === 'en' ? 'English' : l === 'mr' ? 'मराठी' : 'हिंदी'}
            </button>
          ))}
        </div>
      </div>

      {/* Friendly Error State with Retry Button */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{error}</span>
          </div>
          <button
            onClick={fetchEarningsData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 ks-glass-card">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent mb-3" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading your earnings and payments...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ks-glass-card ks-glass-card-hover p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {t.totalEarnings}
                </span>
                <TrendingUp size={18} className="text-cyan-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-headline-md">
                ₹{(summary?.totalEarnings || 0).toLocaleString()}
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Lifetime verified earnings
              </div>
            </div>

            <div className="ks-glass-card ks-glass-card-hover p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t.thisMonth}
                </span>
                <Calendar size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-headline-md">
                ₹{(summary?.thisMonth || 0).toLocaleString()}
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Earned this calendar month
              </div>
            </div>

            <div className="ks-glass-card ks-glass-card-hover p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {t.thisWeek}
                </span>
                <Clock size={18} className="text-sky-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-headline-md">
                ₹{(summary?.thisWeek || 0).toLocaleString()}
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Current week attendance wages
              </div>
            </div>

            <div className="ks-glass-card ks-glass-card-hover p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t.pendingAmount}
                </span>
                <Sparkles size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-headline-md">
                ₹{(summary?.pending || 0).toLocaleString()}
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Awaiting employer release
              </div>
            </div>
          </div>

          {/* Payment Records List */}
          <div className="ks-glass-card overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-cyan-500" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-headline-sm">
                  {t.paymentHistory}
                </h2>
              </div>
              <span className="ks-badge-cyan text-xs">
                {payments.length} {payments.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-14 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center mx-auto">
                  <CreditCard size={28} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">No payment records yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Payments recorded by employers for your project attendance and daily wages will automatically appear here with full ledger receipts.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {payments.map((p) => (
                  <div
                    key={p._id || p.id}
                    className="p-5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                          {p.projectId?.name || p.projectId?.title || 'Project Milestone Wage'}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            p.status === 'recorded'
                              ? 'ks-badge-emerald'
                              : p.status === 'pending'
                              ? 'ks-badge-amber'
                              : p.status === 'disputed'
                              ? 'ks-badge-rose'
                              : 'ks-badge-cyan'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Date: {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</span>
                        <span>
                          Type: <strong className="capitalize text-slate-700 dark:text-slate-300">{p.type}</strong>
                        </span>
                        <span>
                          Method: <strong className="uppercase text-slate-700 dark:text-slate-300">{p.method}</strong>
                        </span>
                        {p.reference && <span>Ref: {p.reference}</span>}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1.5 bg-slate-100/60 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/10">
                          "{p.notes}"
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-headline-sm">
                        ₹{p.amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkerEarningsPage;
