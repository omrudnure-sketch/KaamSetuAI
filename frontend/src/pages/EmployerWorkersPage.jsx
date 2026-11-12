import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchWorkersWithNL } from '../services/aiService.js';
import { inviteWorker } from '../services/invitationService.js';
import { getEmployerJobs } from '../services/jobApi.js';
import { fetchWorkersForEmployer } from '../services/profileApi.js';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { getSessionLocation } from '../services/locationService.js';
import ChatRequestModal from '../components/chat/ChatRequestModal.jsx';
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
  Users,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Map,
  Zap,
  MessageSquare,
} from 'lucide-react';

const COMMON_SKILLS = [
  'All Skills',
  'Mason',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Welder',
  'Tile Mason',
  'Bar Bender',
  'Construction Worker',
  'General Labor',
];

const MAHARASHTRA_CITIES = ['All Cities', 'Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Kolhapur', 'Thane', 'Aurangabad'];

const EXAMPLE_QUERIES = [
  'Electrician in Pune under ₹1,000/day',
  'Plumber in Kolhapur with at least 3 years experience',
  'Painter near Mumbai available now',
  'Carpenter with 4+ star rating under ₹1,200',
];

export const EmployerWorkersPage = () => {
  // Discovery mode: 'area' (direct area & trade filters) vs 'ai' (natural-language search)
  const [discoveryMode, setDiscoveryMode] = useState('area');

  // Structured area & availability filter states
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [availabilityOnly, setAvailabilityOnly] = useState(true); // default: Ready for Work only
  const [minExp, setMinExp] = useState('');
  const [maxWageFilter, setMaxWageFilter] = useState('');

  // Location awareness & reverse geocoded display
  const [activeLocation, setActiveLocation] = useState(() => getSessionLocation());

  const handleLocationAcquired = (locData) => {
    setActiveLocation(locData);
    if (locData.city) {
      setSelectedCity(locData.city);
    }
    if (locData.area) {
      setSelectedArea(locData.area);
    }
    handleStructuredSearch({
      city: locData.city || selectedCity,
      area: locData.area || selectedArea,
      page: 1,
    });
  };

  const handleLocationCleared = () => {
    setActiveLocation(null);
    setSelectedCity('');
    setSelectedArea('');
    handleStructuredSearch({ city: '', area: '', page: 1 });
  };

  // AI search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [interpretedFilters, setInterpretedFilters] = useState(null);

  // Common result & pagination states
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
  const [chatRequestWorker, setChatRequestWorker] = useState(null);
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteWage, setInviteWage] = useState(800);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({ type: '', message: '' });

  // Initial load
  useEffect(() => {
    fetchEmployerJobs();
    handleStructuredSearch();
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

  const normalizeWorker = (worker) => {
    const isAvail =
      worker.isAvailableForWork !== undefined
        ? worker.isAvailableForWork
        : worker.availability === 'available' || worker.availability === 'ready';

    const safeUserId =
      typeof worker.userId === 'object' && worker.userId !== null
        ? String(worker.userId._id || worker.userId.id || '')
        : String(worker.userId || '');
    const safeWorkerId =
      typeof worker.workerId === 'object' && worker.workerId !== null
        ? String(worker.workerId._id || worker.workerId.id || '')
        : String(worker.workerId || safeUserId || worker.id || worker._id || '');
    const safeProfileId = String(worker.profileId || worker.workerProfileId || worker.id || worker._id || '');
    const resolvedId = safeWorkerId || safeUserId || safeProfileId;

    return {
      workerId: resolvedId,
      userId: safeUserId || resolvedId,
      profileId: safeProfileId,
      id: resolvedId,
      _id: resolvedId,
      workerName: worker.workerName || worker.fullName || 'Skilled Worker',
      primarySkill: worker.primarySkill || (Array.isArray(worker.skills) && worker.skills[0]) || 'General Worker',
      skills: Array.isArray(worker.skills) ? worker.skills : [],
      experienceYears: worker.experienceYears || 0,
      dailyWage: worker.dailyWage || 0,
      hourlyRate: worker.hourlyRate || 0,
      rating: worker.rating || 0,
      totalReviews: worker.totalReviews || worker.reviewCount || 0,
      location: {
        city: worker.city || worker.location?.city || 'Unspecified',
        area: worker.area || worker.location?.area || '',
      },
      isAvailableForWork: isAvail,
      availability: isAvail ? 'available' : 'unavailable',
      distanceKm: worker.distanceKm ?? null,
      profilePhoto: worker.profilePhoto || '',
    };
  };

  const handleStructuredSearch = async (overrideParams = {}) => {
    try {
      setLoading(true);
      setError('');
      setDiscoveryMode('area');

      const cityVal = overrideParams.city !== undefined ? overrideParams.city : selectedCity;
      const areaVal = overrideParams.area !== undefined ? overrideParams.area : selectedArea;
      const skillVal = overrideParams.skill !== undefined ? overrideParams.skill : selectedSkill;
      const availVal = overrideParams.availabilityOnly !== undefined ? overrideParams.availabilityOnly : availabilityOnly;
      const pageVal = overrideParams.page !== undefined ? overrideParams.page : page;
      const sortVal = overrideParams.sort !== undefined ? overrideParams.sort : sort;

      const params = {
        city: cityVal && cityVal !== 'All Cities' ? cityVal : undefined,
        area: areaVal || undefined,
        skill: skillVal && skillVal !== 'All Skills' ? skillVal : undefined,
        availability: availVal ? 'available' : 'any',
        minExperience: minExp ? Number(minExp) : undefined,
        maxWage: maxWageFilter ? Number(maxWageFilter) : undefined,
        sort: sortVal,
        page: pageVal,
        limit: 10,
      };

      const res = await fetchWorkersForEmployer(params);
      if (res.success && res.data) {
        const rawList = res.data.workers || [];
        setResults(rawList.map(normalizeWorker));
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setError(res.error?.message || 'Failed to fetch workers for area');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error discovering workers in selected area');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (queryText = searchQuery) => {
    const q = queryText.trim();
    if (!q) return;

    try {
      setLoading(true);
      setError('');
      setDiscoveryMode('ai');
      setActiveQuery(q);

      const res = await searchWorkersWithNL({
        query: q,
        page,
        limit: 10,
        sort,
      });

      if (res.success && res.data) {
        const rawList = res.data.results || [];
        setResults(rawList.map(normalizeWorker));
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

  const handleStructuredFormSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    handleStructuredSearch({ page: 1 });
  };

  const handleClearFilters = () => {
    setSelectedCity('');
    setSelectedArea('');
    setSelectedSkill('');
    setAvailabilityOnly(false);
    setMinExp('');
    setMaxWageFilter('');
    setPage(1);
    handleStructuredSearch({
      city: '',
      area: '',
      skill: '',
      availabilityOnly: false,
      page: 1,
    });
  };

  const handleRemoveFilterKey = (key) => {
    if (!interpretedFilters) return;
    const updated = { ...interpretedFilters };
    delete updated[key];
    setInterpretedFilters(updated);

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

      const targetWorkerId =
        selectedWorkerForInvite.userId ||
        selectedWorkerForInvite.workerId ||
        selectedWorkerForInvite.id ||
        selectedWorkerForInvite._id;

      const res = await inviteWorker({
        jobId: inviteJobId,
        workerId: String(targetWorkerId),
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
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="ks-badge-cyan">
              <Sparkles className="w-3.5 h-3.5" /> AI Matching Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>Discover Skilled Workers</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Find verified workers by city, locality, trade, and immediate availability across Maharashtra.
          </p>
        </div>

        <Link
          to="/employer/workers/map"
          className="ks-btn-outline text-xs px-4 py-2.5 font-bold flex items-center gap-2 self-start md:self-auto relative z-10"
        >
          <Map className="w-4 h-4 text-primary dark:text-sky-400" />
          <span>Switch to Map View</span>
        </Link>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-200/80 dark:border-white/10 gap-2">
        <button
          type="button"
          onClick={() => {
            setDiscoveryMode('area');
            handleStructuredSearch({ page: 1 });
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x flex items-center gap-2 ${
            discoveryMode === 'area'
              ? 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-primary dark:text-sky-400 border-b-transparent shadow-xs'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4 text-primary dark:text-sky-400" />
          <span>Area & Trade Discovery</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDiscoveryMode('ai');
            if (activeQuery) {
              handleSearch(activeQuery);
            }
          }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x flex items-center gap-2 ${
            discoveryMode === 'ai'
              ? 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 text-primary dark:text-sky-400 border-b-transparent shadow-xs'
              : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>AI Smart Search</span>
        </button>
      </div>

      {/* Discovery Controls Container */}
      <div className="ks-glass-card p-6 space-y-4">
        {/* Geolocation Access & Taken Location Display */}
        <LocationAccessBar
          activeLocation={activeLocation}
          onLocationAcquired={handleLocationAcquired}
          onLocationCleared={handleLocationCleared}
          role="employer"
          customButtonLabel="Find Workers Near My Location"
          showRadius={false}
        />

        {discoveryMode === 'area' ? (
          /* Structured Area & Trade Discovery Form */
          <form onSubmit={handleStructuredFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* City Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City / Region</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="ks-input text-xs"
                >
                  {MAHARASHTRA_CITIES.map((c) => (
                    <option key={c} value={c === 'All Cities' ? '' : c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Locality / Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Locality / Area</label>
                <input
                  type="text"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  placeholder="e.g. Kothrud, Andheri, Hinjewadi"
                  className="ks-input text-xs"
                />
              </div>

              {/* Trade / Skill */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Trade / Skill</label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="ks-input text-xs"
                >
                  {COMMON_SKILLS.map((s) => (
                    <option key={s} value={s === 'All Skills' ? '' : s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Daily Wage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Wage (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={maxWageFilter}
                  onChange={(e) => setMaxWageFilter(e.target.value)}
                  placeholder="e.g. 1200"
                  className="ks-input text-xs"
                />
              </div>
            </div>

            {/* Quick Filters & Availability Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                {/* Availability Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setAvailabilityOnly(!availabilityOnly)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    availabilityOnly
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${availabilityOnly ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{availabilityOnly ? '✓ Ready for Work Only' : 'All Availability Statuses'}</span>
                </button>

                {/* Quick City Chips */}
                <span className="text-[11px] text-slate-400 ml-1">Quick:</span>
                {['Pune', 'Mumbai', 'Kolhapur', 'Nagpur'].map((cityChip) => (
                  <button
                    key={cityChip}
                    type="button"
                    onClick={() => {
                      setSelectedCity(cityChip);
                      handleStructuredSearch({ city: cityChip, page: 1 });
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      selectedCity === cityChip
                        ? 'bg-primary text-white border-primary'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200'
                    }`}
                  >
                    {cityChip}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="ks-btn-outline text-xs px-3 py-1.5 font-semibold"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ks-btn-primary text-xs px-4 py-1.5 font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Natural-Language Search Box */
          <div className="space-y-4">
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-primary dark:text-sky-400 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Describe the worker you need (e.g. Find an electrician in Pune under ₹1,000 with 3+ years experience)..."
                  className="ks-input pl-12 pr-28 py-3 text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="ks-btn-primary absolute right-2 top-2 px-4 py-1.5 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>

              {/* 1-Click Example Queries */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Try asking:</span>
                {EXAMPLE_QUERIES.map((eg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(eg);
                      setPage(1);
                      handleSearch(eg);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors"
                  >
                    &ldquo;{eg}&rdquo;
                  </button>
                ))}
              </div>
            </form>

            {/* Interpreted Filter Chips Display */}
            {interpretedFilters && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Interpreted Structured Filters
                  </span>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveQuery('');
                      setInterpretedFilters(null);
                      setPage(1);
                      handleSearch('Available workers in Maharashtra');
                    }}
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Sort & Result Count Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {pagination.total > 0 ? (
              <>Showing {results.length} of <strong className="text-slate-700">{pagination.total}</strong> verified workers found in database</>
            ) : (
              <>0 workers found</>
            )}
          </span>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-semibold">Sort by:</label>
            <select
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value;
                setSort(newSort);
                setPage(1);
                if (discoveryMode === 'area') {
                  handleStructuredSearch({ sort: newSort, page: 1 });
                } else {
                  handleSearch(activeQuery || searchQuery);
                }
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
            <p className="text-slate-600 text-sm font-medium">Finding matching workers in database...</p>
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
              onClick={() => {
                if (discoveryMode === 'area') handleStructuredSearch();
                else handleSearch();
              }}
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
              Try broadening your location, clearing the trade filter, or allowing all availability statuses.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary text-xs font-bold rounded-xl border border-slate-200"
            >
              View All Workers
            </button>
          </div>
        )}

        {/* Worker Cards Grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((worker) => {
              const workerNameStr = worker?.workerName || 'Worker';
              const initial = workerNameStr.charAt(0).toUpperCase() || 'W';
              return (
                <div
                  key={worker.workerId}
                  className="ks-glass-card hover:border-primary/40 dark:hover:border-sky-500/40 p-6 transition-all space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Top: Photo/Avatar & Name & Availability Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary dark:text-sky-400 font-extrabold text-base overflow-hidden flex-shrink-0">
                          {worker.profilePhoto ? (
                            <img src={worker.profilePhoto} alt={workerNameStr} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                              {workerNameStr}
                            </h3>
                            {worker.isVerified && (
                              <CheckCircle className="w-4 h-4 text-primary dark:text-sky-400 flex-shrink-0" title="Verified Worker" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-primary dark:text-sky-400 uppercase tracking-wide">
                            {worker.primarySkill || 'General Worker'}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Availability Pill */}
                      {worker.isAvailableForWork ? (
                        <span className="ks-badge-emerald inline-flex items-center gap-1.5 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Ready for Work</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Not Available
                        </span>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{worker.experienceYears ?? 0} years exp</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {(worker.rating || 0) > 0 ? `${worker.rating}★ (${worker.totalReviews || 0})` : 'New profile'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-extrabold text-emerald-500 dark:text-emerald-400">
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

                    {/* Distance Pill if available */}
                    {worker.distanceKm !== null && worker.distanceKm !== undefined && (
                      <div className="pt-1">
                        <span className="ks-badge-cyan text-[11px] font-bold">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>~{worker.distanceKm} km away</span>
                        </span>
                      </div>
                    )}

                    {/* Additional Skills Tags */}
                    {Array.isArray(worker.skills) && worker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {worker.skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] rounded-md border border-slate-200 dark:border-white/10"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setSelectedWorkerForProfile(worker)}
                      className="ks-btn-outline py-2 px-2 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
                      <span>Profile</span>
                    </button>

                    <button
                      onClick={() =>
                        setChatRequestWorker({
                          id: worker.userId || worker.workerId || worker.id || worker._id,
                          name: worker.workerName || worker.name || 'Worker',
                          role: 'worker',
                          trade: worker.primarySkill || 'General Trade',
                        })
                      }
                      className="py-2 px-2 text-xs font-bold rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center justify-center gap-1 transition-colors"
                      title="Direct message or pre-agreement chat request"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>

                    <button
                      onClick={() => handleOpenInvite(worker)}
                      className="ks-btn-primary py-2 px-2 text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Invite</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between ks-glass-card p-4 text-xs text-slate-600 dark:text-slate-400 shadow-xs">
            <span>
              Page <strong className="text-slate-900 dark:text-white">{pagination.page}</strong> of <strong className="text-slate-900 dark:text-white">{pagination.totalPages}</strong> ({pagination.total} workers)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  const newPage = pagination.page - 1;
                  setPage(newPage);
                  if (discoveryMode === 'area') {
                    handleStructuredSearch({ page: newPage });
                  } else {
                    handleSearch(activeQuery || searchQuery);
                  }
                }}
                className="ks-btn-outline px-3 py-1.5 disabled:opacity-40 text-xs font-semibold"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const newPage = pagination.page + 1;
                  setPage(newPage);
                  if (discoveryMode === 'area') {
                    handleStructuredSearch({ page: newPage });
                  } else {
                    handleSearch(activeQuery || searchQuery);
                  }
                }}
                className="ks-btn-outline px-3 py-1.5 disabled:opacity-40 text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedWorkerForProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ks-glass-card w-full max-w-md p-6 space-y-5 shadow-2xl relative border-white/20">
            <button
              onClick={() => setSelectedWorkerForProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary dark:text-sky-400 font-extrabold text-lg">
                {selectedWorkerForProfile.workerName?.charAt(0).toUpperCase() || 'W'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedWorkerForProfile.workerName || 'Worker'}</h3>
                <p className="text-xs font-semibold text-primary dark:text-sky-400 uppercase">
                  {selectedWorkerForProfile.primarySkill || 'General Worker'}
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-xl p-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-slate-600 dark:text-slate-400">Experience:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedWorkerForProfile.experienceYears ?? 0} Years</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-slate-600 dark:text-slate-400">Daily Rate:</span>
                <span className="font-bold text-emerald-500 dark:text-emerald-400">
                  {selectedWorkerForProfile.dailyWage ? `₹${selectedWorkerForProfile.dailyWage}/day` : 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-slate-600 dark:text-slate-400">City / Area:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedWorkerForProfile.location?.city || 'N/A'} {selectedWorkerForProfile.location?.area ? `(${selectedWorkerForProfile.location.area})` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">Rating & Reviews:</span>
                <span className="font-bold text-amber-500">
                  {selectedWorkerForProfile.rating || 0}★ ({selectedWorkerForProfile.totalReviews || 0} reviews)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const worker = selectedWorkerForProfile;
                  setSelectedWorkerForProfile(null);
                  setChatRequestWorker({
                    id: worker.userId || worker.workerId || worker.id || worker._id,
                    name: worker.workerName || worker.name || 'Worker',
                    role: 'worker',
                    trade: worker.primarySkill || 'General Trade',
                  });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message Worker</span>
              </button>

              <button
                onClick={() => {
                  const worker = selectedWorkerForProfile;
                  setSelectedWorkerForProfile(null);
                  handleOpenInvite(worker);
                }}
                className="ks-btn-primary text-xs px-5 py-2 font-bold shadow-xs"
              >
                Invite This Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {selectedWorkerForInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="ks-glass-card border-white/20 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedWorkerForInvite(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Invite {selectedWorkerForInvite.workerName || 'Worker'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Send a direct invitation to work on your posted job.
              </p>
            </div>

            {inviteStatus.message && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  inviteStatus.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {inviteStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                )}
                <span>{inviteStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Job to Invite For
                </label>
                {employerJobs.length > 0 ? (
                  <select
                    required
                    value={inviteJobId}
                    onChange={(e) => setInviteJobId(e.target.value)}
                    className="ks-input text-xs"
                  >
                    {employerJobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} ({j.skillRequired}) - ₹{j.wageAmount}/day
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs">
                    You don't have any open jobs posted yet.{' '}
                    <Link to="/employer/jobs/create" className="underline font-bold text-primary dark:text-sky-400">
                      Post a job first
                    </Link>{' '}
                    to send invitations.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Offered Daily Wage (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inviteWage}
                  onChange={(e) => setInviteWage(e.target.value)}
                  className="ks-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message (Optional)
                </label>
                <textarea
                  rows="3"
                  maxLength="1000"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="ks-input text-xs"
                  placeholder="Describe timing, site address, or specifics..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerForInvite(null)}
                  className="ks-btn-outline text-xs px-4 py-2 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteJobId}
                  className="ks-btn-primary text-xs px-4 py-2 font-extrabold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inviting ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Agreement Chat Request Modal */}
      {chatRequestWorker && (
        <ChatRequestModal
          isOpen={!!chatRequestWorker}
          recipient={chatRequestWorker}
          currentUserRole="employer"
          onClose={() => setChatRequestWorker(null)}
        />
      )}
    </div>
  );
};

export default EmployerWorkersPage;
