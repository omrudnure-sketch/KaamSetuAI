import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getJobById } from '../services/jobApi.js';
import { applyToJob, getWorkerApplications } from '../services/applicationService.js';
import { translateJobDescription } from '../services/aiService.js';
import { workerJobTranslations } from '../utils/workerJobTranslations.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
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
} from 'lucide-react';

export const WorkerJobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  // Translation state (Step 23.4)
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
          newLang === 'mr'
            ? 'अनुवाद सध्या अनुपलब्ध आहे.'
            : newLang === 'hi'
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
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Application could not be submitted. Please try again.';
      setApplyError(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm my-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-medium">{tJob.loadingJobs}</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 my-6 bg-white border border-slate-200 rounded-2xl space-y-4 text-center shadow-sm">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {lang === 'mr'
            ? 'काम आढळले नाही (Job Not Found)'
            : lang === 'hi'
            ? 'कार्य नहीं मिला (Job Not Found)'
            : 'Job Not Found'}
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          {lang === 'mr'
            ? 'तुम्ही शोधत असलेले काम अस्तित्वात नाही किंवा ते बंद केले गेले आहे.'
            : lang === 'hi'
            ? 'आप जिस नौकरी की तलाश कर रहे हैं वह मौजूद नहीं है या हटा दी गई है।'
            : 'The job posting you are looking for does not exist, has expired, or has been removed.'}
        </p>
        <div className="pt-2">
          <Link
            to={`/worker/jobs?lang=${lang}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
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
      <div className="w-full max-w-4xl mx-auto p-8 my-6 bg-white border border-slate-200 rounded-2xl space-y-4 text-center shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || tJob.errorLoadingJobs}</h2>
        <p className="text-xs text-slate-600">Please check your network connection and try again.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={fetchDetailAndApp}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            to={`/worker/jobs?lang=${lang}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-xl font-semibold border border-slate-200"
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
      {/* Top Bar Navigation & Language Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          to={`/worker/jobs?lang=${lang}`}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{tJob.backToJobs}</span>
        </Link>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl">
          <Globe className="w-3.5 h-3.5 text-primary ml-1" />
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('mr')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => handleLanguageChange('hi')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-md capitalize">
                {skillCategory}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${
                  job.status === 'open'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{job.title}</h1>
            <div className="flex items-center gap-2 text-slate-600 text-xs sm:text-sm">
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                {tJob.postedBy}: <strong className="text-slate-900">{employerDisplayName}</strong>
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left sm:text-right flex-shrink-0">
            <p className="text-xs text-slate-600 uppercase font-semibold">{tJob.wageLabel}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">₹{job.wageAmount}</p>
            <p className="text-xs text-slate-600 capitalize">{wageFrequencyText}</p>
          </div>
        </div>

        {/* Application Status Banner or Action Button */}
        {applySuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{applySuccess}</span>
          </div>
        )}

        {existingApplication ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">{tHiring.alreadyApplied}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {tHiring.proposedWage}: ₹{existingApplication.proposedWage} | {tHiring.status}:{' '}
                  <span className="font-bold text-primary capitalize">
                    {tHiring.statuses?.[existingApplication.status] || existingApplication.status}
                  </span>
                </p>
              </div>
            </div>
            <Link
              to={`/worker/applications?lang=${lang}`}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto"
            >
              {tHiring.myApplications} →
            </Link>
          </div>
        ) : job.status !== 'open' ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>{tHiring.jobClosedNotice}</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-900">{tHiring.applyForJob}</p>
              <p className="text-xs text-slate-600">Propose your wage rate and submit application to employer</p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
            >
              <Send className="w-4 h-4" />
              <span>{tHiring.apply}</span>
            </button>
          </div>
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm">
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-amber-700" /> {tJob.workersNeeded}
            </span>
            <span className="font-bold text-slate-900">{job.workersRequired || job.workersNeeded || 1}</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" /> {tJob.locationLabel}
            </span>
            <span className="font-bold text-slate-900 truncate block">{locationText}</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> {tJob.durationLabel}
            </span>
            <span className="font-bold text-slate-900">{durationText}</span>
          </div>
          <div>
            <span className="text-xs text-slate-600 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" /> {tJob.startDateLabel}
            </span>
            <span className="font-bold text-slate-900">{formattedStartDate}</span>
          </div>
        </div>

        {/* Description Section with AI Multilingual Translation (Step 23.4) */}
        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">{tJob.description}</h3>
              {translationMode === 'translated' && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
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
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1"
                >
                  <Languages className="w-3.5 h-3.5 text-primary" />
                  <span>View Original</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('mr')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-primary hover:text-primary-hover text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>मराठी अनुवाद</span>
                  </button>
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('hi')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-primary hover:text-primary-hover text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिंदी अनुवाद</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {isTranslating && (
            <div className="py-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Translating description...</span>
            </div>
          )}

          {translationError && (
            <p className="text-xs text-rose-600 italic">{translationError}</p>
          )}

          {!isTranslating && (
            <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {translationMode === 'translated' && translatedDesc ? translatedDesc : job.description}
            </p>
          )}
        </div>

        {/* Location Info */}
        <div className="space-y-1.5 pt-4 border-t border-slate-100">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">{tJob.locationLabel}</h3>
          <p className="text-slate-700 text-xs sm:text-sm font-medium">{locationText}</p>
          {job.location?.address && (
            <p className="text-slate-500 text-xs">{job.location.address}</p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">{tJob.workingHours}</h3>
            <p className="text-slate-700 text-xs sm:text-sm font-medium">{workingHoursText}</p>
            {job.workingHours?.description && (
              <p className="text-slate-500 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {requirementsList.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">{tJob.requirements}</h3>
              <div className="flex flex-wrap gap-1.5">
                {requirementsList.map((req, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs rounded-lg border border-slate-200 font-medium"
                  >
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{tHiring.applyForJob}</h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tHiring.proposedWage} (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={proposedWage}
                  onChange={(e) => setProposedWage(e.target.value)}
                  placeholder="e.g. 900"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Posted rate: ₹{job.wageAmount} / {wageFrequencyText}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tHiring.message}
                </label>
                <textarea
                  rows="3"
                  placeholder="Share your experience, tools, or availability for this job..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200"
                >
                  {tHiring.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{submitting ? 'Submitting...' : tHiring.submitApplication}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerJobDetailPage;
