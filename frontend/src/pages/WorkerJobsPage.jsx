import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableJobs } from '../services/jobApi.js';
import { getRecommendedJobsForWorker } from '../services/aiService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { workerJobTranslations } from '../utils/workerJobTranslations.js';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { GlassSpringNav } from '../components/GlassSpringNav.jsx';
import { getSessionLocation } from '../services/locationService.js';
import {
  Search,
  Filter,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Globe,
  Sparkles,
  Briefcase,
  CheckCircle,
  Clock,
} from 'lucide-react';

const SKILL_OPTIONS = [
  'electrician',
  'plumber',
  'painter',
  'carpenter',
  'mason',
  'helper',
  'cleaner',
  'other',
];

export const WorkerJobsPage = () => {
  const { user } = useAuth();
  // Language switcher state (en, mr, hi)
  const [lang, setLang] = useState('en');
  const t = workerJobTranslations[lang] || workerJobTranslations.en;

  // Active view tab: 'all' or 'recommended'
  const [activeTab, setActiveTab] = useState('all');

  // All jobs states
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recommended jobs states
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');
  const [recPagination, setRecPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [recPage, setRecPage] = useState(1);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [minWage, setMinWage] = useState('');
  const [durationType, setDurationType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // Consent-based location search states
  const [activeLocation, setActiveLocation] = useState(() => getSessionLocation());
  const [coords, setCoords] = useState(() => {
    const cached = getSessionLocation();
    return cached?.lat && cached?.lng ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [radius, setRadius] = useState(50);

  const handleLocationAcquired = (locData) => {
    setActiveLocation(locData);
    setCoords({ lat: locData.lat, lng: locData.lng });
    setSort('nearest');
    setPage(1);
  };

  const handleLocationCleared = () => {
    setActiveLocation(null);
    setCoords(null);
    setSort('newest');
    setPage(1);
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 6,
        sort,
      };
      if (search.trim()) params.skill = search.trim();
      if (skill) params.skill = skill;
      if (city.trim()) params.city = city.trim();
      if (minWage) params.minWage = minWage;
      if (durationType) params.durationType = durationType;

      if (coords?.lat && coords?.lng) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = radius;
      }

      const res = await getAvailableJobs(params);
      if (res.success && res.data) {
        setJobs(res.data.jobs || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else {
        setError(t.errorLoadingJobs);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message;
      const friendlyMsg =
        err.response?.status === 403 || msg?.toLowerCase().includes('worker roles')
          ? 'Job discovery is available to registered accounts. Please sign in to explore jobs.'
          : (msg || t.errorLoadingJobs);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    const workerId = user?._id || user?.id;
    if (!workerId || user?.role !== 'worker') {
      setRecommendedJobs([]);
      return;
    }

    try {
      setRecLoading(true);
      setRecError('');
      const res = await getRecommendedJobsForWorker(workerId, {
        limit: 6,
        page: recPage,
      });

      if (res.success && res.data) {
        const jobs = res.data.recommendations || res.data.results || [];
        setRecommendedJobs(jobs);
        if (res.data.pagination) {
          setRecPagination(res.data.pagination);
        }
      } else {
        setRecError(res.error?.message || t.errorLoadingJobs);
      }
    } catch (err) {
      setRecError(err.response?.data?.error?.message || t.errorLoadingJobs);
    } finally {
      setRecLoading(false);
    }
  };

  // Fetch when page, search, or filters change
  useEffect(() => {
    if (activeTab === 'all') {
      fetchJobs();
    }
  }, [page, skill, sort, activeTab, coords, radius]);

  // Fetch recommended jobs when tab switches
  useEffect(() => {
    if (activeTab === 'recommended') {
      fetchRecommendedJobs();
    }
  }, [activeTab, recPage, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSkill('');
    setCity('');
    setMinWage('');
    setDurationType('');
    setSort('newest');
    setPage(1);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header with Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>{t.jobsTitle}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">{t.jobsSubtitle}</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs self-start sm:self-auto">
          <Globe className="w-4 h-4 text-primary dark:text-sky-400 ml-1.5" />
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Spring Animated Navigation Tabs */}
      <div className="flex items-center overflow-x-auto pb-2 scrollbar-none">
        <GlassSpringNav
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: t.allJobsTab, icon: Briefcase },
            { key: 'recommended', label: t.recommendedTab, icon: Sparkles },
          ]}
          variant="glass-light"
          size="md"
          ariaLabel="Jobs view tabs"
        />
      </div>

      {/* All Available Jobs View */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Search & Filter Section */}
          <div className="ks-glass-card p-4 sm:p-6 space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="ks-glass-input w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm"
                />
              </div>
              <button
                type="submit"
                className="ks-btn-primary px-6 py-2.5 text-xs font-bold shrink-0"
              >
                {(t.jobsTitle || 'Search').split(' ')[0]}
              </button>
            </form>

            {/* Location Access & Taken Location Display Bar */}
            <LocationAccessBar
              activeLocation={activeLocation}
              onLocationAcquired={handleLocationAcquired}
              onLocationCleared={handleLocationCleared}
              radius={radius}
              onRadiusChange={(r) => {
                setRadius(r);
                setPage(1);
              }}
              showRadius={true}
              lang={lang}
              role="worker"
            />

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
              {/* Skill Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.skillLabel}</label>
                <select
                  value={skill}
                  onChange={(e) => {
                    setSkill(e.target.value);
                    setPage(1);
                  }}
                  className="ks-glass-input w-full p-2 text-xs capitalize"
                >
                  <option value="">{t.allSkills}</option>
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.cityLabel}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g. Pune"
                  className="ks-glass-input w-full p-2 text-xs"
                />
              </div>

              {/* Wage Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.wageRangeLabel}</label>
                <input
                  type="number"
                  value={minWage}
                  onChange={(e) => {
                    setMinWage(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g. 800"
                  className="ks-glass-input w-full p-2 text-xs"
                />
              </div>

              {/* Duration Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.durationLabel}</label>
                <select
                  value={durationType}
                  onChange={(e) => {
                    setDurationType(e.target.value);
                    setPage(1);
                  }}
                  className="ks-glass-input w-full p-2 text-xs"
                >
                  <option value="">{t?.allDurations || 'All Durations'}</option>
                  <option value="single_day">{t?.durationTypeOptions?.single_day || 'Single Day'}</option>
                  <option value="fixed_duration">{t?.durationTypeOptions?.fixed_duration || 'Fixed Duration'}</option>
                  <option value="until_completion">{t?.durationTypeOptions?.until_completion || 'Until Completion'}</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t?.sortLabel || 'Sort By'}</label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="ks-glass-input w-full p-2 text-xs"
                >
                  <option value="newest">{t?.sortOptions?.newest || t?.sortNewest || 'Newest First'}</option>
                  <option value="wage_high">{t?.sortOptions?.wage_high || t?.sortWageHigh || 'Wage: High to Low'}</option>
                  <option value="wage_low">{t?.sortOptions?.wage_low || t?.sortWageLow || 'Wage: Low to High'}</option>
                  {coords && <option value="nearest">{t?.sortOptions?.nearest || 'Nearest First'}</option>}
                </select>
              </div>
            </div>

            {/* Clear Filters Action */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-sky-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.clearFilters}</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="w-full p-12 text-center ks-glass-card">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{t.loadingJobs}</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div
              className={`p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ks-glass-card ${
                error.toLowerCase().includes('worker') || error.toLowerCase().includes('forbidden')
                  ? 'border-amber-500/30'
                  : 'border-rose-500/30'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle
                  className={`w-6 h-6 flex-shrink-0 mt-0.5 sm:mt-0 ${
                    error.toLowerCase().includes('worker') || error.toLowerCase().includes('forbidden')
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {error.toLowerCase().includes('worker') || error.toLowerCase().includes('forbidden')
                      ? 'This job discovery feed is optimized for registered worker accounts.'
                      : error}
                  </p>
                  {user?.role === 'employer' && (
                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                      As an employer, you can view and manage your posted listings from the Employer Jobs portal.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {user?.role === 'employer' ? (
                  <Link
                    to="/employer/jobs"
                    className="ks-btn-primary px-4 py-2 text-xs font-bold"
                  >
                    Go to My Jobs
                  </Link>
                ) : (
                  <button
                    onClick={fetchJobs}
                    className="ks-btn-outline px-4 py-1.5 text-xs font-semibold"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && jobs.length === 0 && (
            <div className="p-12 text-center ks-glass-card space-y-3">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{t.noJobsFound}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Try adjusting your filters or search terms.</p>
              <button
                onClick={handleClearFilters}
                className="ks-btn-outline px-4 py-2 text-xs font-bold"
              >
                {t.clearFilters}
              </button>
            </div>
          )}

          {/* Job Cards Grid */}
          {!loading && !error && jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="ks-glass-card-hover p-5 sm:p-6 space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="ks-badge-cyan text-xs capitalize inline-block mb-1.5">
                          {job.skillRequired}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                          {job.title}
                        </h3>
                      </div>
                      <span className="ks-badge-emerald text-xs">
                        {job.status}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Proximity / Distance Badge */}
                    {job.distanceKm !== null && job.distanceKm !== undefined && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 w-fit">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span>~{job.distanceKm} km {lang === 'mr' ? 'अंतरावर' : lang === 'hi' ? 'दूर' : 'away'}</span>
                      </div>
                    )}

                    {/* Job Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-3 border-t border-slate-200/80 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{job.wageAmount}</span>
                        <span className="text-slate-500 dark:text-slate-400">/{job.wageType}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span className="truncate">
                          {(() => {
                            if (typeof job.location === 'string' && job.location.trim()) {
                              return job.location;
                            }
                            const parts = [
                              job.location?.area || job.area,
                              job.location?.city || job.city,
                              job.location?.address || job.address
                            ].filter(Boolean);
                            if (parts.length > 0) return parts.join(', ');
                            return job.location?.city || job.city || job.location?.area || job.area || 'Kolhapur';
                          })()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary dark:text-sky-400 flex-shrink-0" />
                        <span>
                          {(() => {
                            const rawDate = job.startDate || job.start_date || job.createdAt || job.created_at;
                            if (rawDate && !isNaN(new Date(rawDate).getTime())) {
                              return new Date(rawDate).toLocaleDateString();
                            }
                            return lang === 'mr' ? 'लगेच उपलब्ध' : lang === 'hi' ? 'तुरंत उपलब्ध' : 'Immediate';
                          })()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>{job.workersRequired || job.workersNeeded || job.workers_needed || 1} {t.workersNeeded}</span>
                      </div>
                    </div>

                    {job.employerId?.name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                        {t.postedBy}: <strong className="text-slate-900 dark:text-white">{job.employerId.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
                    <Link
                      to={`/worker/jobs/${job._id}?lang=${lang}`}
                      className="ks-btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t.viewJobDetails}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          {!loading && !error && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between ks-glass-card p-4 text-xs text-slate-700 dark:text-slate-300">
              <span>
                {t.page} <strong>{pagination.page}</strong> {t.of} <strong>{pagination.totalPages}</strong> ({pagination.total} jobs)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="ks-btn-outline px-3 py-1.5 disabled:opacity-40"
                >
                  {t.prev}
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="ks-btn-outline px-3 py-1.5 disabled:opacity-40"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Jobs View */}
      {activeTab === 'recommended' && (
        <div className="space-y-6">
          <div className="ks-glass-hero p-6">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary dark:text-sky-400" />
              <span>{t.recommendedJobsTitle}</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">{t.recommendedJobsSubtitle}</p>
          </div>

          {/* Loading */}
          {recLoading && (
            <div className="p-12 text-center ks-glass-card">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{t.loadingRecommended}</p>
            </div>
          )}

          {/* Error */}
          {recError && !recLoading && (
            <div className="p-6 ks-glass-card border-rose-500/30 flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-500" />
                <p className="text-sm font-medium">{recError}</p>
              </div>
              <button
                onClick={fetchRecommendedJobs}
                className="ks-btn-outline px-4 py-1.5 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!recLoading && !recError && recommendedJobs.length === 0 && (
            <div className="p-12 text-center ks-glass-card space-y-3">
              <Sparkles className="w-8 h-8 text-primary dark:text-sky-400 mx-auto opacity-75" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">{t.noRecommendedJobs}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Make sure your worker profile has skills, city, and expected rate updated.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="ks-btn-primary px-4 py-2 text-xs font-bold"
              >
                {t.allJobsTab}
              </button>
            </div>
          )}

          {/* Recommended Jobs Grid */}
          {!recLoading && !recError && recommendedJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendedJobs.map((item) => {
                const scoreClass =
                  item.matchScore >= 80
                    ? 'ks-badge-emerald'
                    : item.matchScore >= 60
                    ? 'ks-badge-cyan'
                    : 'ks-badge-amber';

                return (
                  <div
                    key={item.jobId}
                    className="ks-glass-card-hover p-6 space-y-4 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="ks-badge-cyan text-xs capitalize inline-block mb-1.5">
                            {item.skillRequired}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                            {item.jobTitle}
                          </h3>
                        </div>

                        {/* Match Score Badge */}
                        <div className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1 ${scoreClass}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{item.matchScore}% {t.matchScore}</span>
                        </div>
                      </div>

                      {/* Why Recommended Explanation */}
                      <div className="p-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-xl space-y-1">
                        <span className="text-[11px] font-bold text-primary dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {t.whyRecommended}
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                          "{item.explanation}"
                        </p>
                      </div>

                      {/* Job Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{item.wage}</span>
                          <span className="text-slate-500 dark:text-slate-400">/{item.wageType}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                          <span className="truncate">{item.location || item.city || 'Kolhapur'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary dark:text-sky-400 flex-shrink-0" />
                          <span>
                            {item.startDate && !isNaN(new Date(item.startDate).getTime())
                              ? new Date(item.startDate).toLocaleDateString()
                              : (lang === 'mr' ? 'लगेच उपलब्ध' : lang === 'hi' ? 'तुरंत उपलब्ध' : 'Immediate')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-purple-500" />
                          <span className="capitalize">{item.durationType?.replace('_', ' ') || 'Single day'}</span>
                        </div>
                      </div>

                      {item.employerName && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                          {t.postedBy}: <strong className="text-slate-900 dark:text-white">{item.employerName}</strong>
                        </p>
                      )}
                    </div>

                    {/* View Details Action */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
                      <Link
                        to={`/worker/jobs/${item.jobId}?lang=${lang}`}
                        className="ks-btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{t.viewJobDetails}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommended Pagination */}
          {!recLoading && !recError && recPagination.totalPages > 1 && (
            <div className="flex items-center justify-between ks-glass-card p-4 text-xs text-slate-700 dark:text-slate-300">
              <span>
                {t.page} <strong>{recPagination.page}</strong> {t.of} <strong>{recPagination.totalPages}</strong> ({recPagination.total} jobs)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={recPagination.page <= 1}
                  onClick={() => setRecPage((p) => p - 1)}
                  className="ks-btn-outline px-3 py-1.5 disabled:opacity-40"
                >
                  {t.prev}
                </button>
                <button
                  disabled={recPagination.page >= recPagination.totalPages}
                  onClick={() => setRecPage((p) => p + 1)}
                  className="ks-btn-outline px-3 py-1.5 disabled:opacity-40"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkerJobsPage;
