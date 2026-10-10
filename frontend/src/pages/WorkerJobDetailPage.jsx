import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getJobById } from '../services/jobApi.js';
import { applyToJob, getWorkerApplications } from '../services/applicationService.js';
import { translateJobDescription } from '../services/aiService.js';
import { workerJobTranslations } from '../utils/workerJobTranslations.js';
import { workerHiringTranslations } from '../utils/workerHiringTranslations.js';
import { ArrowLeft, MapPin, DollarSign, Calendar, Clock, Users, Globe, AlertCircle, Building, CheckCircle, Send, Languages, Sparkles } from 'lucide-react';

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

  // Application form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposedWage, setProposedWage] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  // Translation state (Step 23.4)
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationMode, setTranslationMode] = useState('original');
  const [activeTranslationLang, setActiveTranslationLang] = useState(lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'mr');
  const [translationError, setTranslationError] = useState('');

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
        setTranslationError('Translation currently unavailable.');
      }
    } catch (err) {
      setTranslationError('Translation request could not be processed.');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const fetchDetailAndApp = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getJobById(id);
        if (res.success && res.data) {
          setJob(res.data);
          setProposedWage(res.data.wageAmount);
        } else {
          setError(res.error?.message || tJob.errorLoadingJobs);
        }

        // Check if worker already applied
        const appsRes = await getWorkerApplications({ jobId: id });
        if (appsRes.success && appsRes.data) {
          const matchingApp = appsRes.data.find(a => a.jobId?._id === id || a.jobId === id);
          if (matchingApp) {
            setExistingApplication(matchingApp);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || tJob.errorLoadingJobs);
      } finally {
        setLoading(false);
      }
    };
    fetchDetailAndApp();
  }, [id]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setApplyError('');
      setApplySuccess('');

      const res = await applyToJob(id, {
        proposedWage: Number(proposedWage),
        message,
      });

      if (res.success && res.data) {
        setExistingApplication(res.data);
        setApplySuccess(tHiring.submitApplication + ' ' + tHiring.statuses.pending);
        setShowApplyModal(false);
      } else {
        setApplyError(res.error?.message || 'Failed to submit application');
      }
    } catch (err) {
      setApplyError(err.response?.data?.error?.message || 'Application failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm font-medium">{tJob.loadingJobs}</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-850 border border-slate-800 rounded-2xl space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">{error || tJob.errorLoadingJobs}</h2>
        <Link to="/worker/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl font-semibold">
          <ArrowLeft className="w-4 h-4" /> {tJob.backToJobs}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar Navigation & Language Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/worker/jobs')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{tJob.backToJobs}</span>
        </button>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
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

      {/* Main Detail Card */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-md capitalize">
                {job.skillRequired}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/20">
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{job.title}</h1>
            {job.employerId?.name && (
              <div className="flex items-center gap-2 mt-2 text-slate-300 text-sm">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>{tJob.postedBy}: <strong>{job.employerId.name}</strong></span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left sm:text-right">
            <p className="text-xs text-slate-400 uppercase font-semibold">{tJob.wageLabel}</p>
            <p className="text-2xl font-extrabold text-emerald-400">₹{job.wageAmount}</p>
            <p className="text-xs text-slate-400">{tJob.wageTypeOptions[job.wageType] || job.wageType}</p>
          </div>
        </div>

        {/* Application Status Banner or Action Button */}
        {applySuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{applySuccess}</span>
          </div>
        )}

        {existingApplication ? (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
              <div>
                <p className="text-sm font-bold text-white">{tHiring.alreadyApplied}</p>
                <p className="text-xs text-slate-400">
                  {tHiring.proposedWage}: ₹{existingApplication.proposedWage} | {tHiring.status}: {' '}
                  <span className="font-bold text-cyan-400">
                    {tHiring.statuses[existingApplication.status] || existingApplication.status}
                  </span>
                </p>
              </div>
            </div>
            <Link
              to="/worker/applications"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all"
            >
              {tHiring.myApplications} →
            </Link>
          </div>
        ) : job.status !== 'open' ? (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>{tHiring.jobClosedNotice}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div>
              <p className="text-sm font-bold text-white">{tHiring.applyForJob}</p>
              <p className="text-xs text-slate-400">Propose your wage and submit application to employer</p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" />
              <span>{tHiring.apply}</span>
            </button>
          </div>
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm">
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Users className="w-3.5 h-3.5 text-amber-400" /> {tJob.workersNeeded}</span>
            <span className="font-bold text-white">{job.workersRequired}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {tJob.locationLabel}</span>
            <span className="font-bold text-white">{job.location?.city || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5 text-blue-400" /> {tJob.durationLabel}</span>
            <span className="font-bold text-white">{tJob.durationTypeOptions[job.durationType] || job.durationType}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-purple-400" /> {tJob.startDateLabel}</span>
            <span className="font-bold text-white">{new Date(job.startDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Description Section with AI Multilingual Translation (Step 23.4) */}
        <div className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">{tJob.description}</h3>
              {translationMode === 'translated' && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
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
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View Original (English)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('mr')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg border border-slate-700 hover:border-cyan-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>मराठी अनुवाद</span>
                  </button>
                  <button
                    type="button"
                    disabled={isTranslating}
                    onClick={() => handleTranslateDesc('hi')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg border border-slate-700 hover:border-cyan-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>हिंदी अनुवाद</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {isTranslating && (
            <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Translating description...</span>
            </div>
          )}

          {translationError && (
            <p className="text-xs text-rose-400 italic">{translationError}</p>
          )}

          {!isTranslating && (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {translationMode === 'translated' && translatedDesc ? translatedDesc : job.description}
            </p>
          )}
        </div>

        {/* Location Info */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">{tJob.locationLabel}</h3>
          <p className="text-slate-300 text-sm">
            {job.location?.city || ''}{job.location?.area ? `, ${job.location.area}` : ''}
          </p>
          {job.location?.address && (
            <p className="text-slate-400 text-xs">{job.location.address}</p>
          )}
        </div>

        {/* Working Hours & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">{tJob.workingHours}</h3>
            <p className="text-slate-300 text-sm">
              {job.workingHours?.start} - {job.workingHours?.end}
            </p>
            {job.workingHours?.description && (
              <p className="text-slate-400 text-xs">{job.workingHours.description}</p>
            )}
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">{tJob.requirements}</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{tHiring.applyForJob}</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{tHiring.proposedWage} (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={proposedWage}
                  onChange={(e) => setProposedWage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{tHiring.message}</label>
                <textarea
                  rows="3"
                  placeholder="Share your experience, skills or availability note..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {tHiring.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all"
                >
                  {submitting ? 'Submitting...' : tHiring.submitApplication}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
