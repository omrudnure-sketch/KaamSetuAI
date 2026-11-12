import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getHiringAgreement,
  getAgreementContact,
  acceptHiringAgreement,
  rejectHiringAgreement,
  counterOffer,
} from '../services/hiringService.js';
import { createProjectFromAgreement } from '../services/projectService.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import {
  ArrowLeft,
  Globe,
  FileCheck,
  Building,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  History,
  Send,
  HardHat,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Navigation,
} from 'lucide-react';

export const WorkerHiringDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [agreement, setAgreement] = useState(null);
  const [employerContact, setEmployerContact] = useState(null);
  const [confirmedJobSite, setConfirmedJobSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Counter Offer Modal state
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterForm, setCounterForm] = useState({
    wageType: 'daily',
    proposedWage: '',
    durationType: 'fixed_duration',
    startDate: '',
    estimatedEndDate: '',
    workingHours: { start: '09:00', end: '18:00', description: '' },
    message: '',
  });
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getHiringAgreement(id);
      if (res.success && res.data) {
        setAgreement(res.data);
        if (res.data.status === 'confirmed') {
          if (res.data.employerContact) {
            setEmployerContact(res.data.employerContact);
          }
          try {
            const cRes = await getAgreementContact(id);
            if (cRes.success && cRes.data) {
              if (cRes.data.employer) {
                setEmployerContact(cRes.data.employer);
              }
              if (cRes.data.job) {
                setConfirmedJobSite(cRes.data.job);
              }
            }
          } catch (_err) {
            // Ignore
          }
        } else {
          setEmployerContact(null);
          setConfirmedJobSite(null);
        }

        const parseDateSafe = (d) => {
          if (!d) return '';
          const parsed = new Date(d);
          return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
        };

        setCounterForm({
          wageType: res.data.wageType || 'daily',
          proposedWage: res.data.proposedWage || '',
          durationType: res.data.durationType || 'single_day',
          startDate: parseDateSafe(res.data.startDate),
          estimatedEndDate: parseDateSafe(res.data.estimatedEndDate),
          workingHours: res.data.workingHours || { start: '09:00', end: '18:00', description: '' },
          message: '',
        });
      } else {
        setError(res.error?.message || 'Failed to fetch agreement details');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch agreement details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleCreateOrViewProject = async () => {
    try {
      setCreatingProject(true);
      const res = await createProjectFromAgreement(id);
      if (res.success && res.data) {
        const projId = res.data.project?._id || res.data._id;
        navigate(`/worker/projects/${projId}`);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to initialize project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionMessage('');
      const res = await acceptHiringAgreement(id);
      if (res.success) {
        setAgreement(res.data);
        setActionMessage(
          res.data.status === 'confirmed'
            ? 'Hiring Agreement officially CONFIRMED by both parties!'
            : 'You have accepted the terms. Waiting for employer final response.'
        );
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to accept agreement');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this hiring agreement?')) return;
    try {
      setActionMessage('');
      const res = await rejectHiringAgreement(id);
      if (res.success) {
        setAgreement(res.data);
        setActionMessage('Hiring Agreement rejected.');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reject agreement');
    }
  };

  const handleCounterSubmit = async (e) => {
    e.preventDefault();
    try {
      setCounterSubmitting(true);
      setCounterError('');

      const payload = {
        wageType: counterForm.wageType,
        proposedWage: Number(counterForm.proposedWage),
        durationType: counterForm.durationType,
        startDate: counterForm.startDate,
        estimatedEndDate: counterForm.estimatedEndDate || null,
        workingHours: counterForm.workingHours,
        message: counterForm.message,
      };

      const res = await counterOffer(id, payload);
      if (res.success) {
        setAgreement(res.data);
        setShowCounterModal(false);
        setActionMessage('Counter offer submitted successfully!');
      } else {
        setCounterError(res.error?.message || 'Failed to submit counter offer');
      }
    } catch (err) {
      setCounterError(err.response?.data?.error?.message || 'Counter offer failed');
    } finally {
      setCounterSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="ks-badge-emerald text-xs">{t.statuses[status] || status}</span>;
      case 'pending_worker':
        return <span className="ks-badge-amber text-xs">{t.statuses[status] || status}</span>;
      case 'pending_employer':
        return <span className="ks-badge-cyan text-xs">{t.statuses[status] || status}</span>;
      case 'negotiation':
        return <span className="ks-badge-purple text-xs">{t.statuses[status] || status}</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="ks-badge-rose text-xs">{t.statuses[status] || status}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{t.statuses[status] || status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center ks-glass-card">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading agreement details...</p>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 ks-glass-card text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{error || 'Agreement Not Found'}</h2>
        <button
          onClick={() => navigate('/worker/hiring')}
          className="ks-btn-outline inline-flex items-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hiring List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Language Switcher */}
      <div className="flex items-center justify-end gap-4">
        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <Globe className="w-4 h-4 text-primary dark:text-sky-400 ml-1.5" />
          {['en', 'mr', 'hi'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                lang === l
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {l === 'en' ? 'English' : l === 'mr' ? 'मराठी' : 'हिंदी'}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-xs backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Glass Card */}
      <div className="ks-glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(agreement.status)}
              {agreement.status === 'confirmed' && (
                <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> CONFIRMED AGREEMENT
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {agreement.jobId?.title || 'Job Title'}
            </h1>
            {agreement.employerId?.name && (
              <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-400 text-sm">
                <Building className="w-4 h-4 text-primary dark:text-sky-400" />
                <span>
                  {t.employerDetails}: <strong className="text-slate-900 dark:text-white">{agreement.employerId.name}</strong>
                  {agreement.status === 'confirmed' && (employerContact?.phone || agreement.employerId?.phone) && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                      • {employerContact?.phone || agreement.employerId?.phone}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-left sm:text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
              {agreement.status === 'confirmed' ? t.agreedWage : t.proposedWage}
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{agreement.status === 'confirmed' ? agreement.agreedWage : agreement.proposedWage}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.wageTypes[agreement.wageType] || agreement.wageType}</p>
          </div>
        </div>

        {/* Employer Contact Information & Job Site Card (Confirmed Agreements Only) */}
        {agreement.status === 'confirmed' ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">
                  Authorized Employer Contact & Job Location
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/30 w-fit">
                Unlocked for Confirmed Agreement
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm">
              <div className="p-3.5 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Employer / Business</span>
                <span className="font-bold text-slate-900 dark:text-white block truncate">
                  {employerContact?.name || agreement.employerId?.name || 'Employer'}
                </span>
              </div>

              <div className="p-3.5 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Phone Number</span>
                {employerContact?.phone || agreement.employerId?.phone ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {employerContact?.phone || agreement.employerId?.phone}
                    </span>
                    <a
                      href={`tel:${employerContact?.phone || agreement.employerId?.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex-shrink-0"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">Not provided</span>
                )}
              </div>

              <div className="p-3.5 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Email Address</span>
                {employerContact?.email || agreement.employerId?.email ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                      {employerContact?.email || agreement.employerId?.email}
                    </span>
                    <a
                      href={`mailto:${employerContact?.email || agreement.employerId?.email}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    >
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">Not provided</span>
                )}
              </div>
            </div>

            {/* Confirmed Job Site Address & Navigation */}
            <div className="p-4 bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Confirmed Job Site Location</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {confirmedJobSite?.address ||
                      agreement.jobId?.address ||
                      (agreement.jobId?.location?.address) ||
                      (confirmedJobSite?.city ? `${confirmedJobSite.city}, ${confirmedJobSite.area || ''}` : 'Job site location shared by employer')}
                  </p>
                  {(confirmedJobSite?.city || agreement.jobId?.city) && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {confirmedJobSite?.city || agreement.jobId?.city} {confirmedJobSite?.area ? `• ${confirmedJobSite.area}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {(() => {
                const lat = confirmedJobSite?.latitude ?? agreement.jobId?.latitude;
                const lng = confirmedJobSite?.longitude ?? agreement.jobId?.longitude;
                const addr = confirmedJobSite?.address || agreement.jobId?.address || confirmedJobSite?.city || agreement.jobId?.city;
                const hasCoords = lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng));
                const destUrl = hasCoords
                  ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                  : addr
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
                  : null;

                if (!destUrl) return null;
                return (
                  <a
                    href={destUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto flex-shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions</span>
                  </a>
                );
              })()}
            </div>

            {(employerContact?.preferredLanguage || employerContact?.contactPreference) && (
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium pt-1">
                Preferred Language / Channel: <strong className="font-bold">{employerContact.preferredLanguage || 'English'} ({employerContact.contactPreference || 'Phone'})</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Employer direct contact details and exact job location will be automatically unlocked once both parties mutually confirm the agreement.</span>
          </div>
        )}

        {/* Action Panel for Worker */}
        {agreement.status === 'confirmed' ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">Hiring Terms Finalized & Confirmed</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Project is ready for daily attendance and progress tracking.</p>
              </div>
            </div>

            <button
              onClick={handleCreateOrViewProject}
              disabled={creatingProject}
              className="ks-btn-primary px-6 py-2.5 text-sm font-extrabold flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span>{creatingProject ? 'Loading Project...' : 'Open Project Workspace →'}</span>
            </button>
          </div>
        ) : agreement.status === 'rejected' || agreement.status === 'cancelled' ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-500" />
            <span>This agreement is {agreement.status}.</span>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Review Agreement Terms</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {agreement.status === 'pending_worker'
                    ? 'Employer has submitted an offer version. You can Accept, Reject, or Counter.'
                    : 'Awaiting employer response to your proposal. You can still counter if needed.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.accept}</span>
                </button>
                <button
                  onClick={() => setShowCounterModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.counterOffer}</span>
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t.reject}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agreement Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary dark:text-sky-400" /> {t.duration}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {t.durationTypes[agreement.durationType] || agreement.durationType}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-primary dark:text-sky-400" /> {t.startDate}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{new Date(agreement.startDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-500" /> {t.endDate}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {agreement.estimatedEndDate ? new Date(agreement.estimatedEndDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Working Hours */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.workingHours}</h3>
          <p className="text-sm text-slate-800 dark:text-slate-200">
            {agreement.workingHours?.start} - {agreement.workingHours?.end}
            {agreement.workingHours?.description ? ` (${agreement.workingHours.description})` : ''}
          </p>
        </div>

        {/* Offer History */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <History className="w-4 h-4 text-primary dark:text-sky-400" />
            <span>{t.offerHistory} (Version {agreement.currentVersion})</span>
          </h3>

          <div className="space-y-3">
            {agreement.offerHistory && agreement.offerHistory.map((off, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary dark:text-sky-400">v{off.version}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      off.proposedBy === 'worker' ? 'ks-badge-purple' : 'ks-badge-cyan'
                    }`}>
                      Proposed by {off.proposedBy}
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">{new Date(off.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-900 dark:text-white">
                  <span>Wage: <strong className="text-emerald-600 dark:text-emerald-400">₹{off.wage}</strong> ({off.wageType})</span>
                  <span>Duration: <strong>{off.durationType}</strong></span>
                  <span>Start: <strong>{new Date(off.startDate).toLocaleDateString()}</strong></span>
                </div>
                {off.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{off.message}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ks-glass-card max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.submitCounterOffer}</h3>
              <button
                onClick={() => setShowCounterModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {counterError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                {counterError}
              </div>
            )}

            <form onSubmit={handleCounterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Wage Type</label>
                  <select
                    value={counterForm.wageType}
                    onChange={(e) => setCounterForm({ ...counterForm, wageType: e.target.value })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  >
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="fixed">Fixed Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.proposedWage} (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={counterForm.proposedWage}
                    onChange={(e) => setCounterForm({ ...counterForm, proposedWage: e.target.value })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration Type</label>
                  <select
                    value={counterForm.durationType}
                    onChange={(e) => setCounterForm({ ...counterForm, durationType: e.target.value })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  >
                    <option value="single_day">Single Day</option>
                    <option value="fixed_duration">Fixed Duration</option>
                    <option value="until_completion">Until Completion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.startDate}</label>
                  <input
                    type="date"
                    required
                    value={counterForm.startDate}
                    onChange={(e) => setCounterForm({ ...counterForm, startDate: e.target.value })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  />
                </div>
              </div>

              {counterForm.durationType === 'fixed_duration' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.endDate}</label>
                  <input
                    type="date"
                    required
                    value={counterForm.estimatedEndDate}
                    onChange={(e) => setCounterForm({ ...counterForm, estimatedEndDate: e.target.value })}
                    className="ks-glass-input w-full p-2.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.message}</label>
                <textarea
                  rows="3"
                  placeholder="Reasoning for your counter offer..."
                  value={counterForm.message}
                  onChange={(e) => setCounterForm({ ...counterForm, message: e.target.value })}
                  className="ks-glass-input w-full p-2.5 text-xs"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="ks-btn-outline px-4 py-2 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={counterSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md"
                >
                  {counterSubmitting ? 'Submitting...' : t.submitCounterOffer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerHiringDetailPage;
