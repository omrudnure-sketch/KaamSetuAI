import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableJobs } from '../services/jobApi.js';
import { getRecommendedJobsForWorker } from '../services/aiService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { workerJobTranslations } from '../utils/workerJobTranslations.js';
import { Search, Filter, MapPin, DollarSign, Calendar, Users, Eye, ArrowRight, RotateCcw, AlertCircle, Globe, Sparkles, Briefcase, CheckCircle } from 'lucide-react';

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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 6,
        sort,
      };
      if (search.trim()) params.skill = search.trim(); // search query param fallback
      if (skill) params.skill = skill;
      if (city.trim()) params.city = city.trim();
      if (minWage) params.minWage = minWage;
      if (durationType) params.durationType = durationType;

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
      setError(err.response?.data?.error?.message || t.errorLoadingJobs);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    const workerId = user?._id || user?.id;
    if (!workerId) return;

    try {
      setRecLoading(true);
      setRecError('');
      const res = await getRecommendedJobsForWorker(workerId, {
        page: recPage,
        limit: 6,
        minScore: 30,
      });

      if (res.success && res.data) {
        setRecommendedJobs(res.data.results || []);
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

  useEffect(() => {
    if (activeTab === 'all') {
      fetchJobs();
    } else {
      fetchRecommendedJobs();
    }
  }, [page, skill, city, minWage, durationType, sort, activeTab, recPage, user?._id, user?.id]);

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
      {/* Header & Language Switcher */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t.jobsTitle}</h1>
          <p className="text-slate-400 text-sm mt-1">{t.jobsSubtitle}</p>
        </div>

        {/* Language selector buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start md:self-auto">
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
          <Link
            to="/worker/jobs/map"
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs (Step 22) */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t.allJobsTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('recommended')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'recommended'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.recommendedTab}</span>
        </button>
      </div>

      {/* All Available Jobs View */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Search & Filter Section */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow"
          >
            {t.jobsTitle.split(' ')[0]}
          </button>
        </form>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 border-t border-slate-800">
          {/* Skill Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t.skillLabel}</label>
            <select
              value={skill}
              onChange={(e) => {
                setSkill(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none capitalize"
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t.cityLabel}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Pune"
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Wage Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t.wageRangeLabel}</label>
            <input
              type="number"
              value={minWage}
              onChange={(e) => {
                setMinWage(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. 800"
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Duration Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t.durationLabel}</label>
            <select
              value={durationType}
              onChange={(e) => {
                setDurationType(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">{t.allDurations}</option>
              <option value="single_day">{t.durationTypeOptions.single_day}</option>
              <option value="fixed_duration">{t.durationTypeOptions.fixed_duration}</option>
              <option value="until_completion">{t.durationTypeOptions.until_completion}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t.sortLabel}</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-750 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="wage_high">{t.sortWageHigh}</option>
              <option value="wage_low">{t.sortWageLow}</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(skill || city || minWage || durationType || search) && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.clearFilters}</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm font-medium">{t.loadingJobs}</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchJobs}
            className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl space-y-3">
          <p className="text-lg font-bold text-white">{t.noJobsFound}</p>
          <p className="text-slate-400 text-sm">Try adjusting your filters or search terms.</p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-slate-800 text-cyan-400 text-xs font-bold rounded-xl"
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
              className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-md mb-1.5 capitalize">
                      {job.skillRequired}
                    </span>
                    <h3 className="text-lg font-bold text-white line-clamp-1">{job.title}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {job.status}
                  </span>
                </div>

                <p className="text-slate-400 text-sm line-clamp-2">{job.description}</p>

                {/* Job Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-emerald-400">₹{job.wageAmount}</span>
                    <span className="text-slate-500">/{job.wageType}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span className="truncate">{job.location?.city || 'N/A'}{job.location?.area ? `, ${job.location.area}` : ''}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{new Date(job.startDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>{job.workersRequired} {t.workersNeeded}</span>
                  </div>
                </div>

                {job.employerId?.name && (
                  <p className="text-xs text-slate-500 pt-1">
                    {t.postedBy}: <strong className="text-slate-300">{job.employerId.name}</strong>
                  </p>
                )}
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                  <p className="text-[11px] font-semibold text-amber-300">{t.applyNotice}</p>
                </div>

                <Link
                  to={`/worker/jobs/${job._id}?lang=${lang}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
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
        <div className="flex items-center justify-between bg-slate-850 p-4 border border-slate-800 rounded-2xl text-xs text-slate-300">
          <span>
            {t.page} <strong>{pagination.page}</strong> {t.of} <strong>{pagination.totalPages}</strong> ({pagination.total} jobs)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 rounded-lg font-semibold"
            >
              {t.prev}
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 rounded-lg font-semibold"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Recommended Jobs View (Step 22.6) */}
      {activeTab === 'recommended' && (
        <div className="space-y-6">
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>{t.recommendedJobsTitle}</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.recommendedJobsSubtitle}</p>
          </div>

          {/* Loading */}
          {recLoading && (
            <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl">
              <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-400 text-sm font-medium">{t.loadingRecommended}</p>
            </div>
          )}

          {/* Error */}
          {recError && !recLoading && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4 text-rose-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
                <p className="text-sm font-medium">{recError}</p>
              </div>
              <button
                onClick={fetchRecommendedJobs}
                className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!recLoading && !recError && recommendedJobs.length === 0 && (
            <div className="p-12 text-center bg-slate-850 border border-slate-800 rounded-2xl space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto opacity-75" />
              <p className="text-lg font-bold text-white">{t.noRecommendedJobs}</p>
              <p className="text-slate-400 text-sm">
                Make sure your worker profile has skills, city, and expected rate updated.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 bg-slate-800 text-cyan-400 text-xs font-bold rounded-xl"
              >
                {t.allJobsTab}
              </button>
            </div>
          )}

          {/* Recommended Jobs Grid */}
          {!recLoading && !recError && recommendedJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendedJobs.map((item) => {
                const scoreColor =
                  item.matchScore >= 80
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : item.matchScore >= 60
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={item.jobId}
                    className="bg-slate-850 border border-slate-800 hover:border-slate-750 rounded-2xl p-6 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-block text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-md mb-1.5 capitalize">
                            {item.skillRequired}
                          </span>
                          <h3 className="text-lg font-bold text-white line-clamp-1">{item.jobTitle}</h3>
                        </div>

                        {/* Match Score Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-lg border text-xs font-black tracking-wider uppercase flex items-center gap-1 ${scoreColor}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{item.matchScore}% {t.matchScore}</span>
                        </div>
                      </div>

                      {/* Why Recommended Explanation */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {t.whyRecommended}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          "{item.explanation}"
                        </p>
                      </div>

                      {/* Job Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span className="font-extrabold text-emerald-400">₹{item.wage}</span>
                          <span className="text-slate-500">/{item.wageType}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          <span className="truncate">{item.location || 'N/A'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span>{item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Immediate'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-purple-400" />
                          <span className="capitalize">{item.durationType?.replace('_', ' ') || 'Single day'}</span>
                        </div>
                      </div>

                      {item.employerName && (
                        <p className="text-xs text-slate-500 pt-1">
                          {t.postedBy}: <strong className="text-slate-300">{item.employerName}</strong>
                        </p>
                      )}
                    </div>

                    {/* View Details Action */}
                    <div className="pt-3 border-t border-slate-800">
                      <Link
                        to={`/worker/jobs/${item.jobId}?lang=${lang}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
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
            <div className="flex items-center justify-between bg-slate-850 p-4 border border-slate-800 rounded-2xl text-xs text-slate-300">
              <span>
                {t.page} <strong>{recPagination.page}</strong> {t.of} <strong>{recPagination.totalPages}</strong> ({recPagination.total} jobs)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={recPagination.page <= 1}
                  onClick={() => setRecPage((p) => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 rounded-lg font-semibold"
                >
                  {t.prev}
                </button>
                <button
                  disabled={recPagination.page >= recPagination.totalPages}
                  onClick={() => setRecPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 rounded-lg font-semibold"
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
