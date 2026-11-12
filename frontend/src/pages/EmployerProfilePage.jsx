import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchEmployerProfile, updateEmployerProfile } from '../services/profileApi.js';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { getSessionLocation } from '../services/locationService.js';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  Building2,
  Phone,
  MapPin,
  FileText,
  Image,
  User,
} from 'lucide-react';

export const EmployerProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [activeLocation, setActiveLocation] = useState(() => getSessionLocation());

  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: '',
    businessType: 'small_business',
    phone: user?.phone || '',
    city: '',
    area: '',
    description: '',
    profilePhoto: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchEmployerProfile();
        if (res?.success && res.data?.profile) {
          const p = res.data.profile;
          setFormData({
            name: p.name || user?.name || '',
            businessName: p.businessName || '',
            businessType: p.businessType || 'small_business',
            phone: p.phone || user?.phone || '',
            city: p.location?.city || '',
            area: p.location?.area || '',
            description: p.description || '',
            profilePhoto: p.profilePhoto || '',
          });
          if (typeof res.data.completionPercentage === 'number') {
            setCompletionPercentage(res.data.completionPercentage);
          }
        }
      } catch (_err) {
        // Pre-fill user defaults if profile not created yet
        setFormData((prev) => ({
          ...prev,
          name: user?.name || '',
          phone: user?.phone || '',
        }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    const payload = {
      name: formData.name,
      businessName: formData.businessName,
      businessType: formData.businessType,
      phone: formData.phone,
      description: formData.description,
      profilePhoto: formData.profilePhoto,
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
      const res = await updateEmployerProfile(payload);
      if (res?.success) {
        setSuccessMsg('Employer profile saved successfully!');
        if (typeof res.data?.completionPercentage === 'number') {
          setCompletionPercentage(res.data.completionPercentage);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save profile.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-600 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading employer profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-sky-500/10 border border-primary/20 dark:border-sky-500/20 flex items-center justify-center text-primary dark:text-sky-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="ks-badge-cyan">
                <Sparkles className="w-3.5 h-3.5" /> Verified Business Account
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Employer Profile</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Manage your company information, hiring locations, and contractor profile
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completion Indicator */}
      <div className="ks-glass-card p-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary dark:text-sky-400" />
            <span>Profile Completion</span>
          </span>
          <span className="font-black text-primary dark:text-sky-400">{completionPercentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="ks-glass-card p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Contact Representative Name *</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Vikram Shah"
              className="ks-input text-xs sm:text-sm"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Business / Company Name *</span>
            </label>
            <input
              type="text"
              name="businessName"
              required
              value={formData.businessName}
              onChange={handleChange}
              placeholder="e.g. Shah Constructions Pvt Ltd"
              className="ks-input text-xs sm:text-sm"
            />
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Business Type</span>
            </label>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="ks-input text-xs sm:text-sm"
            >
              <option value="contractor">Contractor</option>
              <option value="homeowner">Homeowner / Individual</option>
              <option value="small_business">Small Business</option>
              <option value="construction_company">Construction Company</option>
              <option value="other">Other Business Type</option>
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Contact Phone Number</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className="ks-input text-xs sm:text-sm"
            />
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
              role="employer"
              customButtonLabel="Auto-Detect Business Location (GPS)"
              showRadius={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>City</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Mumbai / Pune"
              className="ks-input text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Area / Locality</span>
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Bandra West / Hinjewadi"
              className="ks-input text-xs sm:text-sm"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Business Description</span>
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of your business or typical hiring projects..."
              className="ks-input text-xs sm:text-sm"
            />
          </div>

          {/* Profile Photo URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
              <span>Company Logo / Profile Photo URL</span>
            </label>
            <input
              type="url"
              name="profilePhoto"
              value={formData.profilePhoto}
              onChange={handleChange}
              placeholder="https://example.com/logo.jpg"
              className="ks-input text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="ks-btn-primary w-full py-3 px-4 font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Employer Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployerProfilePage;
