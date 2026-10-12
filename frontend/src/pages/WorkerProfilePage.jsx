import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchWorkerProfile, createWorkerProfile, updateWorkerProfile } from '../services/profileApi.js';
import { workerTranslations } from '../utils/workerTranslations.js';
import { WorkerAvailabilityControl } from '../components/WorkerAvailabilityControl.jsx';
import { HardHat, Globe, CheckCircle2, AlertCircle, Save, Percent, Sparkles, User, MapPin } from 'lucide-react';

export const WorkerProfilePage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState(user?.preferredLanguage || 'en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);

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
            city: p.location?.city || '',
            area: p.location?.area || '',
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
      location: {
        city: formData.city,
        area: formData.area,
        coordinates: {
          type: 'Point',
          coordinates: [0, 0],
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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-600">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header & Language Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.pageTitle}</h1>
            <p className="text-xs text-slate-600">{t.pageSubtitle}</p>
          </div>
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-xs">
          <Globe className="w-4 h-4 text-primary ml-1.5" />
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang('mr')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              lang === 'mr' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            मराठी
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Completion Meter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{t.profileCompletion}</span>
          </span>
          <span className="font-extrabold text-primary">{completionPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
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
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.fullName} *
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Rahul Patil"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Primary Skill */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.primarySkill} *
            </label>
            <select
              name="primarySkill"
              value={formData.primarySkill}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.otherSkills}
            </label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Wiring, Repair, Fitting, Maintenance"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Experience & Daily Wage */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.experienceYears}
            </label>
            <input
              type="number"
              name="experienceYears"
              min="0"
              max="70"
              value={formData.experienceYears}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.dailyWage}
            </label>
            <input
              type="number"
              name="dailyWage"
              min="0"
              value={formData.dailyWage}
              onChange={handleChange}
              placeholder="e.g. 700"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Availability & Preferred Work Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.availability}
            </label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            >
              {Object.entries(t.availabilityStatus).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.preferredWorkType}
            </label>
            <select
              name="preferredWorkType"
              value={formData.preferredWorkType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            >
              {Object.entries(t.workTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Location: City & Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.city}
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Mumbai / Pune / Nashik"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.area}
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Kothrud / Andheri / Shivaji Nagar"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Languages Spoken (Toggle Chips) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              {t.languages}
            </label>
            <div className="flex gap-3">
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
                        ? 'bg-blue-50 border-primary text-primary shadow-xs'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.bio}
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Describe your work experience and specialization..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            ></textarea>
          </div>

          {/* Profile Photo URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {t.profilePhotoUrl}
            </label>
            <input
              type="url"
              name="profilePhoto"
              value={formData.profilePhoto}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
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
