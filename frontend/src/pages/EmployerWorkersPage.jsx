import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchWorkersWithNL } from '../services/aiService.js';
import { inviteWorker } from '../services/invitationService.js';
import { getEmployerJobs } from '../services/jobApi.js';
import {
  Search,
  Sparkles,
  MapPin,
  Briefcase,
  Star,
  DollarSign,
  Clock,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  Send,
  Eye,
  RotateCcw,
  User,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Map,
} from 'lucide-react';

const EXAMPLE_QUERIES = [
  'Electrician in Pune under ₹1,000/day',
  'Plumber in Kolhapur with at least 3 years experience',
  'Painter near Mumbai available now',
  'Carpenter with 4+ star rating under ₹1,200',
];

export const EmployerWorkersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [interpretedFilters, setInterpretedFilters] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sort, setSort] = useState('rating');

  // Employer open jobs for invite modal
  const [employerJobs, setEmployerJobs] = useState([]);
  const [selectedWorkerForProfile, setSelectedWorkerForProfile] = useState(null);
  const [selectedWorkerForInvite, setSelectedWorkerForInvite] = useState(null);
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteWage, setInviteWage] = useState(800);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({ type: '', message: '' });

  // Initial load
  useEffect(() => {
    fetchEmployerJobs();
    handleSearch('Available skilled workers in Pune or Mumbai');
  }, []);

  const fetchEmployerJobs = async () => {
    try {
      const res = await getEmployerJobs({ status: 'open' });
      if (res.success && res.data) {
        const jobs = res.data.jobs || res.data || [];
        setEmployerJobs(jobs);
        if (jobs.length > 0) {
          setInviteJobId(jobs[0]._id);
        }
      }
    } catch (_err) {}
  };

  const handleSearch = async (queryText = searchQuery) => {
    const q = queryText.trim();
    if (!q) return;

    try {
      setLoading(true);
      setError('');
      setActiveQuery(q);

      const res = await searchWorkersWithNL({
        query: q,
        page,
        limit: 10,
        sort,
      });

      if (res.success && res.data) {
        setResults(res.data.results || []);
        setInterpretedFilters(res.data.filters || {});
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setError(res.error?.message || 'Failed to search workers');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Natural-language search request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    handleSearch(searchQuery);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveQuery('');
    setInterpretedFilters(null);
    setPage(1);
    handleSearch('Available workers in Maharashtra');
  };

  const handleRemoveFilterKey = (key) => {
    if (!interpretedFilters) return;
    const updated = { ...interpretedFilters };
    delete updated[key];
    setInterpretedFilters(updated);

    // Re-construct query from remaining filters
    const parts = [];
    if (updated.skill) parts.push(updated.skill);
    if (updated.city) parts.push(`in ${updated.city}`);
    if (updated.maxDailyWage) parts.push(`under ₹${updated.maxDailyWage}`);
    if (updated.minExperienceYears) parts.push(`${updated.minExperienceYears}+ yrs experience`);

    const newQuery = parts.length > 0 ? parts.join(' ') : 'Available workers';
    setSearchQuery(newQuery);
    setPage(1);
    handleSearch(newQuery);
  };

  const handleOpenInvite = (worker) => {
    setSelectedWorkerForInvite(worker);
    setInviteWage(worker.dailyWage || 800);
    setInviteMessage(`Hi ${worker.workerName}, we have an opportunity matching your trade skills.`);
    setInviteStatus({ type: '', message: '' });
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForInvite || !inviteJobId) return;

    try {
      setInviting(true);
      setInviteStatus({ type: '', message: '' });

      const res = await inviteWorker({
        jobId: inviteJobId,
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Find Workers with AI Search</h1>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm">
            Describe what you need in plain English. Our AI extracts structured criteria and matches real MongoDB workers.
          </p>
        </div>

        <Link
          to="/employer/workers/map"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors shadow-sm self-start md:self-auto"
        >
          <Map className="w-4 h-4 text-primary" />
          <span>Switch to Map View</span>
        </Link>
      </div>

      {/* Natural-Language Search Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe the worker you need (e.g. Find an electrician in Pune under ₹1,000 with 3+ years experience)..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-primary focus:bg-white rounded-xl pl-12 pr-28 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="absolute right-2 top-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>

          {/* 1-Click Example Queries */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-500">Try asking:</span>
            {EXAMPLE_QUERIES.map((eg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(eg);
                  setPage(1);
                  handleSearch(eg);
                }}
                className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors"
              >
                "{eg}"
              </button>
            ))}
          </div>
        </form>

        {/* Interpreted Filter Chips Display & Editing (Section 24.6) */}
        {interpretedFilters && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Interpreted Structured Filters
              </span>
              <button
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {interpretedFilters.skill && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold">
                  <span>Skill: <strong>{interpretedFilters.skill}</strong></span>
                  <button onClick={() => handleRemoveFilterKey('skill')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interpretedFilters.city && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                  <MapPin className="w-3 h-3" />
                  <span>City: <strong>{interpretedFilters.city}</strong></span>
                  <button onClick={() => handleRemoveFilterKey('city')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interpretedFilters.maxDailyWage && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  <DollarSign className="w-3 h-3" />
                  <span>Max: <strong>₹{interpretedFilters.maxDailyWage}/day</strong></span>
                  <button onClick={() => handleRemoveFilterKey('maxDailyWage')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interpretedFilters.minExperienceYears && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold">
                  <Briefcase className="w-3 h-3" />
                  <span>Exp: <strong>≥ {interpretedFilters.minExperienceYears} yrs</strong></span>
                  <button onClick={() => handleRemoveFilterKey('minExperienceYears')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interpretedFilters.minRating && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                  <Star className="w-3 h-3" />
                  <span>Rating: <strong>≥ {interpretedFilters.minRating}★</strong></span>
                  <button onClick={() => handleRemoveFilterKey('minRating')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {interpretedFilters.durationDays && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
                  <Clock className="w-3 h-3" />
                  <span>Duration: <strong>{interpretedFilters.durationDays} days</strong></span>
                  <button onClick={() => handleRemoveFilterKey('durationDays')} className="hover:text-slate-900 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Sort & Result Count Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {pagination.total > 0 ? (
              <>Showing {results.length} of <strong className="text-slate-700">{pagination.total}</strong> eligible workers found in database</>
            ) : (
              <>0 workers found</>
            )}
          </span>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-semibold">Sort by:</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
                handleSearch(activeQuery || searchQuery);
              }}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-primary"
            >
              <option value="rating">Highest Rating</option>
              <option value="experience">Most Experienced</option>
              <option value="wage_asc">Lowest Daily Wage</option>
              <option value="wage_desc">Highest Daily Wage</option>
              <option value="newest">Recently Joined</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-slate-600 text-sm font-medium">Interpreting query and finding matching workers...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 text-rose-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-600" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => handleSearch()}
              className="px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
            <Info className="w-10 h-10 text-primary mx-auto opacity-75" />
            <p className="text-lg font-bold text-slate-900">No workers found matching these criteria</p>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Try broadening your location, increasing the maximum wage limit, or describing alternative skills.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary text-xs font-bold rounded-xl border border-slate-200"
            >
              View All Available Workers
            </button>
          </div>
        )}

        {/* Worker Cards Grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((worker) => (
              <div
                key={worker.workerId}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Top: Photo/Avatar & Name */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-primary font-extrabold text-base overflow-hidden flex-shrink-0">
                        {worker.workerName ? worker.workerName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-900">{worker.workerName}</h3>
                          {worker.isVerified && (
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" title="Verified Worker" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">
                          {worker.primarySkill}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                      {worker.availability}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{worker.experienceYears} years exp</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span className="font-semibold text-slate-700">
                        {worker.rating > 0 ? `${worker.rating}★ (${worker.totalReviews})` : 'New profile'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-extrabold text-emerald-700">
                        {worker.dailyWage ? `₹${worker.dailyWage}/day` : 'Rate flexible'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">
                        {worker.location?.city || 'Location flexible'}
                        {worker.location?.area ? `, ${worker.location.area}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Additional Skills Tags */}
                  {worker.skills && worker.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {worker.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded-md border border-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedWorkerForProfile(worker)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => handleOpenInvite(worker)}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invite Worker</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-2xl text-xs text-slate-600 shadow-sm">
            <span>
              Page <strong className="text-slate-900">{pagination.page}</strong> of <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} workers)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  handleSearch(activeQuery || searchQuery);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg font-semibold border border-slate-200 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  handleSearch(activeQuery || searchQuery);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg font-semibold border border-slate-200 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedWorkerForProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-primary font-extrabold text-lg">
                {selectedWorkerForProfile.workerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedWorkerForProfile.workerName}</h3>
                <p className="text-xs font-semibold text-primary uppercase">
                  {selectedWorkerForProfile.primarySkill}
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Experience:</span>
                <span className="font-bold text-slate-900">{selectedWorkerForProfile.experienceYears} Years</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Daily Rate:</span>
                <span className="font-bold text-emerald-700">
                  {selectedWorkerForProfile.dailyWage ? `₹${selectedWorkerForProfile.dailyWage}/day` : 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">City / Area:</span>
                <span className="font-bold text-slate-900">
                  {selectedWorkerForProfile.location?.city || 'N/A'} {selectedWorkerForProfile.location?.area ? `(${selectedWorkerForProfile.location.area})` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Rating & Reviews:</span>
                <span className="font-bold text-amber-600">
                  {selectedWorkerForProfile.rating}★ ({selectedWorkerForProfile.totalReviews} reviews)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const worker = selectedWorkerForProfile;
                  setSelectedWorkerForProfile(null);
                  handleOpenInvite(worker);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Invite This Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {selectedWorkerForInvite && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedWorkerForInvite(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Invite {selectedWorkerForInvite.workerName}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Send a direct invitation to work on your posted job.
              </p>
            </div>

            {inviteStatus.message && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  inviteStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {inviteStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{inviteStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Job to Invite For
                </label>
                {employerJobs.length > 0 ? (
                  <select
                    required
                    value={inviteJobId}
                    onChange={(e) => setInviteJobId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-primary"
                  >
                    {employerJobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} ({j.skillRequired}) - ₹{j.wageAmount}/day
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    You don't have any open jobs posted yet.{' '}
                    <Link to="/employer/jobs/create" className="underline font-bold text-primary">
                      Post a job first
                    </Link>{' '}
                    to send invitations.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Offered Daily Wage (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inviteWage}
                  onChange={(e) => setInviteWage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  rows="3"
                  maxLength="1000"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-primary"
                  placeholder="Describe timing, site address, or specifics..."
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerForInvite(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteJobId}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
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

export default EmployerWorkersPage;
