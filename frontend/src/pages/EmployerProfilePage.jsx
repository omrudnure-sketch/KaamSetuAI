import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchEmployerProfile, updateEmployerProfile } from '../services/profileApi.js';
import { Briefcase, CheckCircle2, AlertCircle, Save, Sparkles, Building2 } from 'lucide-react';

export const EmployerProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);

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
        if (res.success && res.data?.profile) {
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
          coordinates: [0, 0],
        },
      },
    };

    try {
      const res = await updateEmployerProfile(payload);
      if (res.success) {
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading employer profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Employer Profile</h1>
            <p className="text-xs text-slate-400">Manage your business & hiring account details</p>
          </div>
        </div>
      </div>

      {/* Profile Completion Indicator */}
      <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Profile Completion Status</span>
          </span>
          <span className="font-extrabold text-blue-400">{completionPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-slate-850 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Vikram Shah"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Business / Company Name *
            </label>
            <input
              type="text"
              name="businessName"
              required
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Shah Constructions Pvt Ltd"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Business Type
            </label>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Contact Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          {/* Location: City & Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Mumbai / Pune"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Area / Neighborhood
            </label>
            <input
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Bandra West / Hinjewadi"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Business Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of your business or hiring requirements..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            ></textarea>
          </div>

          {/* Profile Photo URL */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Company Logo / Profile Photo URL
            </label>
            <input
              type="url"
              name="profilePhoto"
              value={formData.profilePhoto}
              onChange={handleChange}
              placeholder="https://example.com/logo.jpg"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
      </form>
    </div>
  );
};
