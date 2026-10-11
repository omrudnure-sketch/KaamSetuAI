import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkerInvitations, acceptInvitation, rejectInvitation } from '../services/invitationService.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import { Globe, Mail, Building, DollarSign, Clock, AlertCircle, Check, X, CheckCircle2, ArrowRight } from 'lucide-react';

export const WorkerInvitationsPage = () => {
  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getWorkerInvitations();
      if (res.success) {
        setInvitations(res.data);
      } else {
        setError(res.error?.message || 'Failed to load invitations');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (id) => {
    try {
      setActionMessage('');
      const res = await acceptInvitation(id);
      if (res.success) {
        setActionMessage('Invitation accepted! An employer agreement can now be set up.');
        fetchInvitations();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to accept invitation');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this job invitation?')) return;
    try {
      setActionMessage('');
      const res = await rejectInvitation(id);
      if (res.success) {
        setActionMessage('Invitation rejected.');
        fetchInvitations();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reject invitation');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
            <Mail className="w-7 h-7 text-primary" />
            <span>{t.invitations}</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">{t.invitationsSubtitle}</p>
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

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm font-medium">Loading invitations...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="w-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-600 space-y-4 shadow-sm">
          <Mail className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-800">{t.noInvitations}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv._id}
              className="bg-white border border-slate-200 hover:border-primary/40 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(inv.status)}`}>
                      {t.statuses[inv.status] || inv.status}
                    </span>
                    {inv.jobId?.skillRequired && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {inv.jobId.skillRequired}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {inv.jobId?.title || 'Job Title Unavailable'}
                  </h3>
                  {inv.employerId?.name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <Building className="w-3.5 h-3.5 text-primary" />
                      <span>Employer: <strong className="text-slate-800">{inv.employerId.name}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">{t.proposedWage}</span>
                    <p className="text-xl font-extrabold text-emerald-700">₹{inv.proposedWage}</p>
                  </div>

                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(inv._id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.accept}</span>
                      </button>
                      <button
                        onClick={() => handleReject(inv._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t.reject}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Received: {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  {inv.message && (
                    <span className="text-slate-700 italic max-w-md truncate">
                      "{inv.message}"
                    </span>
                  )}
                </div>

                {inv.status === 'accepted' && (
                  <Link
                    to="/worker/hiring"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-dark"
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

