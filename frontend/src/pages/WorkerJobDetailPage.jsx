import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getJobById } from '../services/jobApi.js';
import { applyToJob, getWorkerApplications } from '../services/applicationService.js';
import { translateJobDescription } from '../services/aiService.js';
import { workerJobTranslations } from '../utils/workerJobTranslations.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import ChatRequestModal from '../components/chat/ChatRequestModal.jsx';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Globe,
  AlertCircle,
  Building,
  CheckCircle,
  Send,
  Languages,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

export const WorkerJobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';

  // Language state initialized from URL param if available
  const initialLang = searchParams.get('lang') || 'en';
  const [lang, setLang] = useState(initialLang);
  const tJob = workerJobTranslations[lang] || workerJobTranslations.en;
  const tHiring = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [job, setJob] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);

  // Application form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposedWage, setProposedWage] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [chatRequestEmployer, setChatRequestEmployer] = useState(null);

  // Translation state
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationMode, setTranslationMode] = useState('original');
  const [activeTranslationLang, setActiveTranslationLang] = useState(
    lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'mr'
  );
  const [translationError, setTranslationError] = useState('');

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    navigate(`/worker/jobs/${id}?lang=${newLang}`, { replace: true });
  };

  const handleTranslateDesc = async (targetLang) => {
    try {
      setIsTranslating(true);
      setTranslationError('');
      const res = await translateJobDescription(id, targetLang);
      if (res.success && res.data) {
        setTranslatedDesc(res.data.translatedDescription);
        setTranslationMode('translated');
        setActiveTranslationLang(targetLang);
      } else {
        setTranslationError(
          targetLang === 'mr'
            ? 'अनुवाद सध्या अनुपलब्ध आहे.'
            : targetLang === 'hi'
            ? 'अनुवाद वर्तमान में अनुपलब्ध है।'
            : 'Translation currently unavailable.'
        );
      }
    } catch (_err) {
      setTranslationError(
        lang === 'mr'
          ? 'अनुवाद विनंतीवर प्रक्रिया करता आली नाही.'
          : lang === 'hi'
          ? 'अनुवाद अनुरोध संसाधित नहीं किया जा सका।'
          : 'Translation request could not be processed.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchDetailAndApp = async () => {
    try {
      setLoading(true);
      setError('');
      setIsNotFound(false);

      const res = await getJobById(id);
      if (res?.success && res?.data) {
        setJob(res.data);
        setProposedWage(res.data.wageAmount || '');
      } else {
        const errorMsg = res?.error?.message || tJob.errorLoadingJobs;
        setError(errorMsg);
        if (errorMsg.toLowerCase().includes('not found')) {
          setIsNotFound(true);
        }
      }

      // Check if worker already applied
      if (isWorker) {
        try {
          const appsRes = await getWorkerApplications({ jobId: id });
          if (appsRes?.success && Array.isArray(appsRes?.data)) {
            const matchingApp = appsRes.data.find(
              (a) =>
                a.jobId?._id === id ||
                a.jobId?.id === id ||
                a.jobId === id ||
                a.job_id === id
            );
            if (matchingApp) {
              setExistingApplication(matchingApp);
            }
          }
        } catch (_appErr) {
          // Non-blocking application check error
        }
      }
    } catch (err) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || tJob.errorLoadingJobs;
      setError(errorMsg);
      if (status === 404 || errorMsg.toLowerCase().includes('not found')) {
        setIsNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailAndApp();
  }, [id]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const wageNum = Number(proposedWage);
    if (!wageNum || wageNum <= 0) {
      setApplyError(
        lang === 'mr'
          ? 'कृपया वैध वेतन प्रविष्ट करा (शून्यापेक्षा जास्त)'
          : lang === 'hi'
          ? 'कृपया वैध वेतन दर्ज करें (0 से अधिक)'
          : 'Please enter a valid wage greater than 0'
      );
      return;
    }

    try {
      setSubmitting(true);
      setApplyError('');
      setApplySuccess('');

      const res = await applyToJob(id, {
        proposedWage: wageNum,
        message: message.trim(),
      });

      if (res?.success && res?.data) {
        setExistingApplication(res.data);
        const successMessage =
          lang === 'mr'
            ? 'कामाचा अर्ज यशस्वीरीत्या सादर केला! मालकाच्या प्रतिसादाची प्रतीक्षा आहे.'
            : lang === 'hi'
            ? 'आवेदन सफलतापूर्वक जमा किया गया! नियोक्ता की प्रतिक्रिया की प्रतीक्षा है।'
            : 'Application submitted successfully! Awaiting employer review.';
        setApplySuccess(successMessage);
        setShowApplyModal(false);
      } else {
        setApplyError(res?.error?.message || 'Failed to submit application');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      const serverMessage =
        err.response?.status === 403 || msg?.toLowerCase().includes('worker roles')
          ? 'Applying for jobs is available to registered worker accounts only. Please sign in as a worker to apply.'
          : msg || 'Application could not be submitted. Please try again.';
      setApplyError(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center ks-glass-card my-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{tJob.loadingJobs}</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 my-6 ks-glass-card space-y-4 text-center">
        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {lang === 'mr'
            ? 'काम आढळले नाही (Job Not Found)'
            : lang === 'hi'
            ? 'कार्य नहीं मिला (Job Not Found)'
            : 'Job Not Found'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {lang === 'mr'
            ? 'तुम्ही शोधत असलेले काम अस्तित्वात नाही किंवा ते बंद केले गेले आहे.'
            : lang === 'hi'
            ? 'आप जिस नौकरी की तलाश कर रहे हैं वह मौजूद नहीं है या हटा दी गई है।'
            : 'The job posting you are looking for does not exist, has expired, or has been removed.'}
        </p>
        <div className="pt-2">
          <Link
            to={`/worker/jobs?lang=${lang}`}
            className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tJob.backToJobs}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 my-6 ks-glass-card space-y-4 text-center border-rose-500/30">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{error || tJob.errorLoadingJobs}</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Please check your network connection and try again.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchDetailAndApp}
            className="ks-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            to={`/worker/jobs?lang=${lang}`}
            className="ks-btn-outline inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tJob.backToJobs}</span>
          </Link>
        </div>
      </div>
    );
  }

  // Safe schema helpers
  const skillCategory =
    job.skillRequired ||
    job.category ||
    (Array.isArray(job.requiredSkills) && job.requiredSkills[0]) ||
    'General Work';

  const employerDisplayName =
    job.employerProfile?.companyName ||
    job.employerProfile?.businessName ||
    job.employerId?.name ||
    'Verified Business';

  const locationText =
    typeof job.location === 'string'
      ? job.location
      : job.location?.city
      ? `${job.location.city}${job.location.area ? ', ' + job.location.area : ''}`
      : job.location?.address || 'Pune';

  const durationText = job.durationDays
    ? `${job.durationDays} ${lang === 'mr' ? 'दिवस' : lang === 'hi' ? 'दिन' : 'Days'}`
    : tJob.durationTypeOptions?.[job.durationType] ||
      tHiring.durationTypes?.[job.durationType] ||
      job.durationType ||
      'Single Day';

  const formattedStartDate = (() => {
    const raw = job.startDate || job.createdAt;
    if (!raw) return lang === 'mr' ? 'लगेच' : lang === 'hi' ? 'तुरंत' : 'Immediate';
    const d = new Date(raw);
    return isNaN(d.getTime())
      ? lang === 'mr'
        ? 'लगेच'
        : lang === 'hi'
        ? 'तुरंत'
        : 'Immediate'
      : d.toLocaleDateString();
  })();

  const workingHoursText =
    job.workingHours?.start && job.workingHours?.end
      ? `${job.workingHours.start} - ${job.workingHours.end}`
      : '09:00 - 18:00 (Standard Shift)';

  const requirementsList =
    Array.isArray(job.requirements) && job.requirements.length > 0
      ? job.requirements
      : Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0
      ? job.requiredSkills
      : [];

  const wageFrequencyText =
    tJob.wageTypeOptions?.[job.wageType] ||
    tHiring.wageTypes?.[job.wageType] ||
    job.wageType ||
    'daily';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 pt-2">
      {/* Language Toggle */}
      <div className="flex items-center justify-end gap-4">
        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <Globe className="w-3.5 h-3.5 text-primary dark:text-sky-400 ml-1" />
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('mr')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => handleLanguageChange('hi')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="ks-glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="ks-badge-cyan text-xs capitalize">
                {skillCategory}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                  job.status === 'open'
                    ? 'ks-badge-emerald'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{job.title}</h1>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              <Building className="w-4 h-4 text-primary dark:text-sky-400 flex-shrink-0" />
              <span>
                {tJob.postedBy}: <strong className="text-slate-900 dark:text-white">{employerDisplayName}</strong>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-left sm:text-right flex-shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{tJob.wageLabel}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{job.wageAmount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{wageFrequencyText}</p>
          </div>
        </div>

        {/* Application Status Banner or Action Button */}
        {applySuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3 backdrop-blur-md">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{applySuccess}</span>
          </div>
        )}

        {existingApplication ? (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-primary dark:text-sky-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{tHiring.alreadyApplied}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {tHiring.proposedWage}: ₹{existingApplication.proposedWage} | {tHiring.status}:{' '}
                  <span className="font-bold text-primary dark:text-sky-400 capitalize">
                    {tHiring.statuses?.[existingApplication.status] || existingApplication.status}
                  </span>
                </p>
              </div>
            </div>
            <Link
              to={`/worker/applications?lang=${lang}`}
              className="ks-btn-primary px-4 py-2 text-xs font-bold self-start sm:self-auto"
            >
              {tHiring.myApplications} →
            </Link>
          </div>
        ) : job.status !== 'open' ? (
          <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span>{tHiring.jobClosedNotice}</span>
          </div>
        ) : !isWorker ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-primary dark:text-sky-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.role === 'employer' ? 'Viewing Job as Employer' : 'Worker Application Only'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Job applications can only be submitted by registered worker accounts.
                </p>
              </div>
            </div>
            {user?.role === 'employer' && (
              <Link
                to="/employer/jobs"
                className="ks-btn-primary px-4 py-2 text-xs font-bold self-start sm:self-auto shrink-0"
              >
                Go to Employer Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{tHiring.applyForJob}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Propose your wage rate, ask questions, or chat with the employer</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  setChatRequestEmployer({
                    id: job.employerId?._id || job.employerId?.id || job.employerId,
                    name: job.employerId?.name || job.contactPerson || 'Employer',
                    role: 'employer',
                    trade: job.title || 'Job Poster',
                  })
                }
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center justify-center gap-2 transition-colors"
                title="Message employer directly before or after applying"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Employer</span>
              </button>

              <button
                onClick={() => setShowApplyModal(true)}
                className="flex-1 sm:flex-none ks-btn-primary px-6 py-2.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>{tHiring.apply}</span>
              </button>
            </div>
          </div>
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-amber-500" /> {tJob.workersNeeded}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{job.workersRequired || job.workersNeeded || 1}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> {tJob.locationLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate block">{locationText}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary dark:text-sky-400" /> {tJob.durationLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{durationText}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-500" /> {tJob.startDateLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{formattedStartDate}</span>
          </div>
        </div>

        {/* Description Section with AI Multilingual Translation */}
        <div className="space-y-3 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{tJob.description}</h3>
              {translationMode === 'translated' && (
                <span className="ks-badge-cyan text-[10px] font-black uppercase flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Translated ({activeTranslationLang.toUpperCase()})
                </span>
              )}
            </div>

            {/* Translation Action Controls */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {translationMode === 'translated' ? (
                <button
                  type="button"
                  onClick={() => setTranslationMode('original')}
                  className="ks-btn-outline px-2.5 py-1 text-xs font-semibold flex items-center gap-1"
                >
                  <Languages className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
                  <span>View Original</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('mr')}
                    className="ks-btn-outline px-2.5 py-1 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>मराठी अनुवाद</span>
                  </button>
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('hi')}
                    className="ks-btn-outline px-2.5 py-1 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिंदी अनुवाद</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {isTranslating && (
            <div className="py-4 text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Translating description...</span>
            </div>
          )}

          {translationError && (
            <p className="text-xs text-rose-500 italic">{translationError}</p>
          )}

          {!isTranslating && (
            <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {translationMode === 'translated' && translatedDesc ? translatedDesc : job.description}
            </p>
          )}
        </div>

        {/* Location Info */}
        <div className="space-y-1.5 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{tJob.locationLabel}</h3>
          <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">{locationText}</p>
          {job.location?.address && (
            <p className="text-slate-500 dark:text-slate-400 text-xs">{job.location.address}</p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{tJob.workingHours}</h3>
            <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">{workingHoursText}</p>
            {job.workingHours?.description && (
              <p className="text-slate-500 dark:text-slate-400 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {requirementsList.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{tJob.requirements}</h3>
              <div className="flex flex-wrap gap-1.5">
                {requirementsList.map((req, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200"
                  >
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Modal with Glass Design */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ks-glass-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{tHiring.applyForJob}</h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tHiring.proposedWage} (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={proposedWage}
                  onChange={(e) => setProposedWage(e.target.value)}
                  placeholder="e.g. 900"
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Posted rate: ₹{job.wageAmount} / {wageFrequencyText}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tHiring.message}
                </label>
                <textarea
                  rows="3"
                  placeholder="Share your experience, tools, or availability for this job..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowApplyModal(false)}
                  className="ks-btn-outline px-4 py-2 text-xs font-semibold"
                >
                  {tHiring.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ks-btn-primary px-5 py-2 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{submitting ? 'Submitting...' : tHiring.submitApplication}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Agreement Chat Request Modal */}
      {chatRequestEmployer && (
        <ChatRequestModal
          isOpen={!!chatRequestEmployer}
          recipient={chatRequestEmployer}
          jobId={job?._id || job?.id}
          currentUserRole="worker"
          onClose={() => setChatRequestEmployer(null)}
        />
      )}
    </div>
  );
};

export default WorkerJobDetailPage;
