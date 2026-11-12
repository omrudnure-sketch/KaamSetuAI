import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getWorkerInvitations, acceptInvitation, rejectInvitation } from '../services/invitationService.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import {
  Mail,
  Building,
  DollarSign,
  Clock,
  AlertCircle,
  Check,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const WorkerInvitationsPage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchInvitations = async () => {
    if (user && user.role !== 'worker') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await getWorkerInvitations();
      if (res.success) {
        setInvitations(res.data || []);
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
  }, [user]);

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
            You are currently signed in with a <strong className="capitalize text-slate-900 dark:text-white">{roleLabel}</strong> account. Job invitations are sent by employers directly to skilled workers.
          </p>
          <div className="pt-2">
            <Link to={dashboardLink} className="ks-btn-primary text-xs">
              <span>Go to {roleLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="ks-badge-amber text-[10px]">{t.statuses.pending || 'Awaiting Response'}</span>;
      case 'accepted':
        return <span className="ks-badge-emerald text-[10px]">{t.statuses.accepted || 'Accepted'}</span>;
      case 'rejected':
        return <span className="ks-badge-rose text-[10px]">{t.statuses.rejected || 'Declined'}</span>;
      default:
        return <span className="ks-badge-cyan text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-headline-md">
              {t.invitations}
            </h1>
            <span className="ks-badge-cyan text-[10px]">{invitations.length} Inbound</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            {t.invitationsSubtitle} • थेट कामाची निमंत्रणे
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-full ks-glass-card self-start sm:self-auto">
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

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-16 text-center ks-glass-card">
          <div className="animate-spin w-9 h-9 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Loading invitations...</p>
        </div>
      ) : error ? (
        <div className="w-full p-8 ks-glass-card text-center text-rose-700 dark:text-rose-300 space-y-2 border-rose-500/30">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-semibold text-sm">
            {error.toLowerCase().includes('worker roles') || error.toLowerCase().includes('forbidden')
              ? 'This page is available to workers only. Please sign in with a worker account to view job invitations.'
              : error}
          </p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="w-full p-14 text-center space-y-4 ks-glass-card">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center mx-auto">
            <Mail size={28} />
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-white">{t.noInvitations}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            When employers search for verified talent and invite you to a job site, your invitations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv._id}
              className="ks-glass-card ks-glass-card-hover p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inv.status)}
                    {inv.jobId?.skillRequired && (
                      <span className="ks-badge-cyan text-[10px]">{inv.jobId.skillRequired}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white font-headline-sm">
                    {inv.jobId?.title || 'Job Opportunity'}
                  </h3>
                  {inv.employerId?.name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building size={14} className="text-cyan-500" />
                      <span>
                        Employer: <strong className="text-slate-800 dark:text-white">{inv.employerId.name}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Proposed Wage
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-headline-sm">
                      ₹{inv.proposedWage}
                    </p>
                  </div>

                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(inv._id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        title="Accept Invitation"
                      >
                        <Check size={14} />
                        <span>{t.accept}</span>
                      </button>
                      <button
                        onClick={() => handleReject(inv._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        title="Decline Invitation"
                      >
                        <X size={14} />
                        <span>{t.reject}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    Received: {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  {inv.message && (
                    <span className="text-slate-700 dark:text-slate-300 italic max-w-md truncate">
                      "{inv.message}"
                    </span>
                  )}
                </div>

                {inv.status === 'accepted' && (
                  <Link
                    to="/worker/hiring"
                    className="inline-flex items-center gap-1.5 font-extrabold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
                  >
                    <span>View Hiring Agreement</span>
                    <ArrowRight size={14} />
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

export default WorkerInvitationsPage;
