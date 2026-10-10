import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getHiringAgreement,
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
} from 'lucide-react';

export const WorkerHiringDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lang, setLang] = useState('en');
  const t = workerHiringTranslations[lang] || workerHiringTranslations.en;

  const [agreement, setAgreement] = useState(null);
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
      if (res.success) {
        setAgreement(res.data);
        setCounterForm({
          wageType: res.data.wageType || 'daily',
          proposedWage: res.data.proposedWage || '',
          durationType: res.data.durationType || 'single_day',
          startDate: res.data.startDate ? new Date(res.data.startDate).toISOString().split('T')[0] : '',
          estimatedEndDate: res.data.estimatedEndDate ? new Date(res.data.estimatedEndDate).toISOString().split('T')[0] : '',
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

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm font-medium">Loading agreement details...</p>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-850 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">{error || 'Agreement Not Found'}</h2>
        <button
          onClick={() => navigate('/worker/hiring')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hiring List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar Navigation & Language Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/worker/hiring')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hiring List</span>
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

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-md border ${getStatusBadgeClass(agreement.status)}`}>
                {t.statuses[agreement.status] || agreement.status}
              </span>
              {agreement.status === 'confirmed' && (
                <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> CONFIRMED AGREEMENT
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {agreement.jobId?.title || 'Job Title'}
            </h1>
            {agreement.employerId?.name && (
              <div className="flex items-center gap-2 mt-2 text-slate-300 text-sm">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>{t.employerDetails}: <strong>{agreement.employerId.name}</strong> ({agreement.employerId.phone || agreement.employerId.email})</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left sm:text-right">
            <p className="text-xs text-slate-400 uppercase font-semibold">
              {agreement.status === 'confirmed' ? t.agreedWage : t.proposedWage}
            </p>
            <p className="text-3xl font-extrabold text-emerald-400">
              ₹{agreement.status === 'confirmed' ? agreement.agreedWage : agreement.proposedWage}
            </p>
            <p className="text-xs text-slate-400">{t.wageTypes[agreement.wageType] || agreement.wageType}</p>
          </div>
        </div>

        {/* Action Panel for Worker */}
        {agreement.status === 'confirmed' ? (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-white">Hiring Terms Finalized & Confirmed</p>
                <p className="text-xs text-slate-400">Project is ready for daily attendance and progress tracking.</p>
              </div>
            </div>

            <button
              onClick={handleCreateOrViewProject}
              disabled={creatingProject}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span>{creatingProject ? 'Loading Project...' : 'Open Project Workspace →'}</span>
            </button>
          </div>
        ) : agreement.status === 'rejected' || agreement.status === 'cancelled' ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span>This agreement is {agreement.status}.</span>
          </div>
        ) : (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Review Agreement Terms</p>
                <p className="text-xs text-slate-400">
                  {agreement.status === 'pending_worker'
                    ? 'Employer has submitted an offer version. You can Accept, Reject, or Counter.'
                    : 'Awaiting employer response to your proposal. You can still counter if needed.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.accept}</span>
                </button>
                <button
                  onClick={() => setShowCounterModal(true)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.counterOffer}</span>
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t.reject}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agreement Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm">
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> {t.duration}</span>
            <span className="font-bold text-white">{t.durationTypes[agreement.durationType] || agreement.durationType}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> {t.startDate}</span>
            <span className="font-bold text-white">{new Date(agreement.startDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-purple-400" /> {t.endDate}</span>
            <span className="font-bold text-white">
              {agreement.estimatedEndDate ? new Date(agreement.estimatedEndDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Working Hours */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{t.workingHours}</h3>
          <p className="text-sm text-slate-300">
            {agreement.workingHours?.start} - {agreement.workingHours?.end}
            {agreement.workingHours?.description ? ` (${agreement.workingHours.description})` : ''}
          </p>
        </div>

        {/* Offer History */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>{t.offerHistory} (Version {agreement.currentVersion})</span>
          </h3>

          <div className="space-y-3">
            {agreement.offerHistory && agreement.offerHistory.map((off, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400">v{off.version}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${off.proposedBy === 'worker' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      Proposed by {off.proposedBy}
                    </span>
                  </div>
                  <span className="text-slate-500">{new Date(off.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-white">
                  <span>Wage: <strong className="text-emerald-400">₹{off.wage}</strong> ({off.wageType})</span>
                  <span>Duration: <strong>{off.durationType}</strong></span>
                  <span>Start: <strong>{new Date(off.startDate).toLocaleDateString()}</strong></span>
                </div>
                {off.message && (
                  <p className="text-xs text-slate-400 italic">"{off.message}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Counter Offer Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{t.submitCounterOffer}</h3>
              <button onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            {counterError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {counterError}
              </div>
            )}

            <form onSubmit={handleCounterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Wage Type</label>
                  <select
                    value={counterForm.wageType}
                    onChange={(e) => setCounterForm({ ...counterForm, wageType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="fixed">Fixed Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.proposedWage} (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={counterForm.proposedWage}
                    onChange={(e) => setCounterForm({ ...counterForm, proposedWage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration Type</label>
                  <select
                    value={counterForm.durationType}
                    onChange={(e) => setCounterForm({ ...counterForm, durationType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="single_day">Single Day</option>
                    <option value="fixed_duration">Fixed Duration</option>
                    <option value="until_completion">Until Completion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.startDate}</label>
                  <input
                    type="date"
                    required
                    value={counterForm.startDate}
                    onChange={(e) => setCounterForm({ ...counterForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {counterForm.durationType === 'fixed_duration' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.endDate}</label>
                  <input
                    type="date"
                    required
                    value={counterForm.estimatedEndDate}
                    onChange={(e) => setCounterForm({ ...counterForm, estimatedEndDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.message}</label>
                <textarea
                  rows="3"
                  placeholder="Reasoning for your counter offer..."
                  value={counterForm.message}
                  onChange={(e) => setCounterForm({ ...counterForm, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={counterSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl transition-all"
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
