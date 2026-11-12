import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchWorkerProfile, updateWorkerProfile } from '../services/profileApi.js';
import { workerTranslations } from '../utils/workerTranslations.js';
import { WorkerAvailabilityControl } from '../components/WorkerAvailabilityControl.jsx';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { getSessionLocation } from '../services/locationService.js';
import {
  HardHat,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Percent,
  Sparkles,
  User,
  MapPin,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export const WorkerProfilePage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState(user?.preferredLanguage || 'en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [activeLocation, setActiveLocation] = useState(() => getSessionLocation());

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    primarySkill: 'electrician',
    skills: '',
    experienceYears: 1,
    dailyWage: 500,
    languages: ['en'],
    preferredWorkType: 'both',
    availability: 'available',
    city: '',
    area: '',
    bio: '',
    profilePhoto: '',
  });

  const t = workerTranslations[lang] || workerTranslations.en;

  useEffect(() => {
    const loadProfile = async () => {
      if (user && user.role !== 'worker') {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchWorkerProfile();
        if (res.success && res.data?.profile) {
          const p = res.data.profile;
          setFormData({
            fullName: p.fullName || user?.name || '',
            primarySkill: p.primarySkill || 'electrician',
            skills: Array.isArray(p.skills) ? p.skills.join(', ') : '',
            experienceYears: p.experienceYears ?? 0,
            dailyWage: p.dailyWage ?? '',
            languages: Array.isArray(p.languages) ? p.languages : ['en'],
            preferredWorkType: p.preferredWorkType || 'both',
            availability: p.availability || 'available',
            city: p.city || (typeof p.location === 'object' ? p.location?.city : p.location) || '',
            area: p.area || (typeof p.location === 'object' ? p.location?.area : '') || '',
            bio: p.bio || '',
            profilePhoto: p.profilePhoto || '',
          });
          if (typeof res.data.completionPercentage === 'number') {
            setCompletionPercentage(res.data.completionPercentage);
          }
        }
      } catch (_err) {
        // If 404, profile does not exist yet (pre-fill name from auth user)
        setFormData((prev) => ({ ...prev, fullName: user?.name || '' }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguageToggle = (langCode) => {
    const exists = formData.languages.includes(langCode);
    if (exists) {
      if (formData.languages.length > 1) {
        setFormData((prev) => ({
          ...prev,
          languages: prev.languages.filter((l) => l !== langCode),
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, langCode],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    const payload = {
      fullName: formData.fullName,
      primarySkill: formData.primarySkill,
      skills: formData.skills
        ? formData.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      experienceYears: Number(formData.experienceYears) || 0,
      dailyWage: formData.dailyWage !== '' ? Number(formData.dailyWage) : null,
      languages: formData.languages,
      preferredWorkType: formData.preferredWorkType,
      availability: formData.availability,
      isAvailableForWork: formData.availability !== 'unavailable',
      bio: formData.bio,
      profilePhoto: formData.profilePhoto,
      city: formData.city,
      area: formData.area,
      location: {
        city: formData.city,
        area: formData.area,
        coordinates: {
          type: 'Point',
          coordinates: activeLocation?.lat && activeLocation?.lng
            ? [activeLocation.lng, activeLocation.lat]
            : [0, 0],
        },
      },
    };

    try {
      const res = await updateWorkerProfile(payload);
      if (res.success) {
        setSuccessMsg(t.successMsg);
        if (typeof res.data?.completionPercentage === 'number') {
          setCompletionPercentage(res.data.completionPercentage);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || t.errorMsg;
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Role Access Restriction Guard
  if (user && user.role !== 'worker') {
    const dashboardLink = user.role === 'employer' ? '/employer' : user.role === 'admin' ? '/admin' : '/';
    const roleLabel = user.role === 'employer' ? 'Employer' : user.role === 'admin' ? 'Administrator' : 'Guest';

    return (
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <div className="ks-glass-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            This page is available to workers only
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You are currently signed in with a <strong className="capitalize text-slate-900 dark:text-white">{roleLabel}</strong> account. Worker profile management is designated for registered workers.
          </p>
          <div className="pt-2">
            <Link
              to={dashboardLink}
              className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <span>Go to {roleLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-600 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Language Switcher with Glass Hero */}
      <div className="ks-glass-hero p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500">
            <User className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t.pageTitle}</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t.pageSubtitle}</p>
          </div>
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs self-start sm:self-auto">
          <Globe className="w-4 h-4 text-primary dark:text-sky-400 ml-1.5" />
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'mr' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            मराठी
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Completion Meter */}
      <div className="ks-glass-card p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary dark:text-sky-400" />
            <span>{t.profileCompletion}</span>
          </span>
          <span className="font-extrabold text-primary dark:text-sky-400">{completionPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-primary to-cyan-400 transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm shadow-xs backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm shadow-xs backdrop-blur-md">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Prominent Worker Availability Status Control */}
      <WorkerAvailabilityControl
        lang={lang}
        initialIsAvailable={formData.availability !== 'unavailable'}
        onStatusChange={(newStatus) =>
          setFormData((prev) => ({
            ...prev,
            availability: newStatus ? 'available' : 'unavailable',
          }))
        }
      />

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="ks-glass-card p-6 sm:p-8 space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.fullName} *
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Rahul Patil"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          {/* Primary Skill */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.primarySkill} *
            </label>
            <select
              name="primarySkill"
              value={formData.primarySkill}
              onChange={handleChange}
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm capitalize"
            >
              {Object.entries(t.skillsList).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Other Skills */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.otherSkills}
            </label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Wiring, Repair, Fitting, Maintenance"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          {/* Experience & Daily Wage */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.experienceYears}
            </label>
            <input
              type="number"
              name="experienceYears"
              min="0"
              max="70"
              value={formData.experienceYears}
              onChange={handleChange}
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.dailyWage}
            </label>
            <input
              type="number"
              name="dailyWage"
              min="0"
              value={formData.dailyWage}
              onChange={handleChange}
              placeholder="e.g. 700"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          {/* Availability & Preferred Work Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.availability}
            </label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            >
              {Object.entries(t.availabilityStatus).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.preferredWorkType}
            </label>
            <select
              name="preferredWorkType"
              value={formData.preferredWorkType}
              onChange={handleChange}
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            >
              {Object.entries(t.workTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Location: City & Area */}
          <div className="sm:col-span-2">
            <LocationAccessBar
              activeLocation={activeLocation}
              onLocationAcquired={(loc) => {
                setActiveLocation(loc);
                setFormData((prev) => ({
                  ...prev,
                  city: loc.city || prev.city,
                  area: loc.area || prev.area,
                }));
              }}
              onLocationCleared={() => {
                setActiveLocation(null);
              }}
              lang={lang}
              role="worker"
              customButtonLabel="Auto-Detect My Profile Location (GPS)"
              showRadius={false}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.city}
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Mumbai / Pune / Nashik"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.area}
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Kothrud / Andheri / Shivaji Nagar"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>

          {/* Languages Spoken (Toggle Chips) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              {t.languages}
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {[
                { code: 'en', label: 'English' },
                { code: 'mr', label: 'मराठी (Marathi)' },
                { code: 'hi', label: 'हिंदी (Hindi)' },
              ].map((langObj) => {
                const isSelected = formData.languages.includes(langObj.code);
                return (
                  <button
                    key={langObj.code}
                    type="button"
                    onClick={() => handleLanguageToggle(langObj.code)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'ks-glass-card hover:border-primary/50'
                    }`}
                  >
                    {langObj.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio / Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.bio}
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Describe your work experience and specialization..."
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm resize-none"
            ></textarea>
          </div>

          {/* Profile Photo URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {t.profilePhotoUrl}
            </label>
            <input
              type="url"
              name="profilePhoto"
              value={formData.profilePhoto}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
              className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="ks-btn-primary w-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <span>{t.saving}</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t.saveProfile}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default WorkerProfilePage;
