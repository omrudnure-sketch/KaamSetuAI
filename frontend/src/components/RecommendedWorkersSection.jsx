import React, { useState, useEffect } from 'react';
import { getRecommendedWorkersForJob } from '../services/aiService.js';
import { inviteWorker } from '../services/invitationService.js';
import {
  Sparkles,
  User,
  Star,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Info,
  X,
} from 'lucide-react';

export const RecommendedWorkersSection = ({ job }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minScore, setMinScore] = useState(30);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });

  // Modal states
  const [selectedWorkerForProfile, setSelectedWorkerForProfile] = useState(null);
  const [selectedWorkerForInvite, setSelectedWorkerForInvite] = useState(null);
  const [inviteWage, setInviteWage] = useState(job?.wageAmount || 800);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({ type: '', message: '' });

  const fetchRecommendations = async () => {
    if (!job?._id || job.status !== 'open') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await getRecommendedWorkersForJob(job._id, {
        page,
        limit: 6,
        minScore,
      });

      if (res.success && res.data) {
        setWorkers(res.data.results || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setError(res.error?.message || 'Could not load recommended workers');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [job?._id, page, minScore]);

  const handleOpenInvite = (worker) => {
    setSelectedWorkerForInvite(worker);
    setInviteWage(job.wageAmount || worker.dailyWage || 800);
    setInviteMessage(`Hi ${worker.workerName}, we have an opening for ${job.title} that matches your profile.`);
    setInviteStatus({ type: '', message: '' });
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForInvite) return;

    try {
      setInviting(true);
      setInviteStatus({ type: '', message: '' });

      const res = await inviteWorker({
        jobId: job._id,
        workerId: selectedWorkerForInvite.workerId,
        proposedWage: Number(inviteWage),
        message: inviteMessage,
      });

      if (res.success) {
        setInviteStatus({
          type: 'success',
          message: `Invitation successfully sent to ${selectedWorkerForInvite.workerName}!`,
        });
        setTimeout(() => {
          setSelectedWorkerForInvite(null);
          setInviteStatus({ type: '', message: '' });
        }, 1800);
      } else {
        setInviteStatus({
          type: 'error',
          message: res.error?.message || 'Failed to send invitation',
        });
      }
    } catch (err) {
      setInviteStatus({
        type: 'error',
        message: err.response?.data?.error?.message || 'An error occurred while sending the invitation',
      });
    } finally {
      setInviting(false);
    }
  };

  if (job?.status !== 'open') {
    return null;
  }

  return (
    <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-white">Recommended Workers</h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            AI-assisted matching based on skill alignment, location, experience, wage, and verified track record.
          </p>
        </div>

        {/* Filter minScore */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Min Match:
          </label>
          <select
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-750 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="30">Any (30%+)</option>
            <option value="50">Moderate (50%+)</option>
            <option value="70">Strong (70%+)</option>
            <option value="85">High Priority (85%+)</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center">
          <div className="animate-spin w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">Evaluating worker profiles and scoring matches...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && workers.length === 0 && (
        <div className="py-10 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <Info className="w-8 h-8 text-cyan-400 mx-auto opacity-75" />
          <h3 className="text-base font-bold text-white">No matching candidates at this threshold</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Try lowering the minimum match score to see available workers with related trade experience or nearby locations.
          </p>
          <button
            onClick={() => {
              setMinScore(30);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            Reset Match Threshold
          </button>
        </div>
      )}

      {/* Worker Cards Grid */}
      {!loading && !error && workers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.map((worker) => {
            const scoreColor =
              worker.matchScore >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : worker.matchScore >= 60
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

            return (
              <div
                key={worker.workerId}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg"
              >
                <div>
                  {/* Top row: Name & Match Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-extrabold text-base overflow-hidden flex-shrink-0">
                        {worker.workerName ? worker.workerName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white leading-tight">{worker.workerName}</h4>
                          {worker.isVerified && (
                            <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" title="Verified Worker" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                          {worker.primarySkill}
                        </span>
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-xs font-black tracking-wider uppercase flex items-center gap-1 ${scoreColor}`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{worker.matchScore}% Match</span>
                    </div>
                  </div>

                  {/* Explanation of match */}
                  <div className="p-2.5 bg-slate-850/80 border border-slate-800/80 rounded-lg mb-3">
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{worker.explanation}"
                    </p>
                  </div>

                  {/* Worker Quick Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{worker.experience} yrs exp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {worker.rating > 0 ? `${worker.rating}★ (${worker.totalReviews})` : 'New profile'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{worker.dailyWage ? `₹${worker.dailyWage}/day` : 'Wage flexible'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        {worker.approximateDistance !== null
                          ? `~${worker.approximateDistance} km`
                          : 'Area matched'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedWorkerForProfile(worker)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => handleOpenInvite(worker)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invite Worker</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total candidates)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedWorkerForProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-extrabold text-lg">
                {selectedWorkerForProfile.workerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedWorkerForProfile.workerName}</h3>
                <p className="text-xs font-semibold text-cyan-400 uppercase">
                  {selectedWorkerForProfile.primarySkill}
                </p>
              </div>
            </div>

            {/* Match Factor Breakdown */}
            <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                <span>Matching Breakdown</span>
                <span className="text-emerald-400 font-black">{selectedWorkerForProfile.matchScore}% Composite</span>
              </h4>

              <div className="space-y-2 text-xs">
                {Object.entries(selectedWorkerForProfile.matchingFactors || {}).map(([key, factor]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize text-slate-400">{key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full"
                          style={{ width: `${factor.score}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right font-semibold text-slate-200">{factor.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Skills */}
            {selectedWorkerForProfile.skills && selectedWorkerForProfile.skills.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Additional Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorkerForProfile.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Info Notes */}
            {selectedWorkerForProfile.missingInformation &&
              selectedWorkerForProfile.missingInformation.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Informational Notes
                  </h5>
                  <ul className="text-xs text-amber-300/90 list-disc list-inside space-y-0.5">
                    {selectedWorkerForProfile.missingInformation.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const worker = selectedWorkerForProfile;
                  setSelectedWorkerForProfile(null);
                  handleOpenInvite(worker);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all"
              >
                Invite This Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Worker Modal */}
      {selectedWorkerForInvite && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedWorkerForInvite(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">Invite {selectedWorkerForInvite.workerName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Send a direct job invitation. The worker must review and accept before any agreement is formed.
              </p>
            </div>

            {inviteStatus.message && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  inviteStatus.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {inviteStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{inviteStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proposed Daily Wage (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inviteWage}
                  onChange={(e) => setInviteWage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Personalized Message (Optional)
                </label>
                <textarea
                  rows="3"
                  maxLength="1000"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Describe timing, site address, or specifics..."
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerForInvite(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inviting ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendedWorkersSection;
