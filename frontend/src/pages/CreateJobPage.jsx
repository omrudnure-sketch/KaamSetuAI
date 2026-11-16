import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createJob, getEmployerJobById, updateJob } from '../services/jobApi.js';
import { Briefcase, ArrowLeft, Save, AlertCircle, CheckCircle2, Sparkles, MapPin, DollarSign, Calendar, Clock } from 'lucide-react';
import { AiJobDescriptionAssistant } from '../components/AiJobDescriptionAssistant.jsx';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { getSessionLocation, KNOWN_REGIONS } from '../services/locationService.js';

const SKILL_OPTIONS = [
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'painter', label: 'Painter' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'mason', label: 'Mason (Gawandi)' },
  { value: 'helper', label: 'Helper / Labor' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'other', label: 'Other Skill' },
];

export const CreateJobPage = () => {
  const { id } = useParams(); // If present, edit mode
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Location detection state
  const [siteLocation, setSiteLocation] = useState(() => getSessionLocation());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillRequired: 'electrician',
    additionalSkills: '',
    workersRequired: 1,
    city: '',
    area: '',
    address: '',
    wageType: 'daily',
    wageAmount: '',
    durationType: 'single_day',
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: '',
    workingStart: '09:00',
    workingEnd: '18:00',
    workingDescription: '',
    requirements: '',
    status: 'open',
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchJobDetails = async () => {
        try {
          setLoading(true);
          const res = await getEmployerJobById(id);
          if (res.success && res.data) {
            const j = res.data;
            setFormData({
              title: j.title || '',
              description: j.description || '',
              skillRequired: j.skillRequired || 'electrician',
              additionalSkills: Array.isArray(j.additionalSkills) ? j.additionalSkills.join(', ') : '',
              workersRequired: j.workersRequired || 1,
              city: j.location?.city || '',
              area: j.location?.area || '',
              address: j.location?.address || '',
              wageType: j.wageType || 'daily',
              wageAmount: j.wageAmount || '',
              durationType: j.durationType || 'single_day',
              startDate: j.startDate ? new Date(j.startDate).toISOString().split('T')[0] : '',
              estimatedEndDate: j.estimatedEndDate ? new Date(j.estimatedEndDate).toISOString().split('T')[0] : '',
              workingStart: j.workingHours?.start || '09:00',
              workingEnd: j.workingHours?.end || '18:00',
              workingDescription: j.workingHours?.description || '',
              requirements: Array.isArray(j.requirements) ? j.requirements.join(', ') : '',
              status: j.status || 'open',
            });
          } else {
            setError(res.error?.message || 'Job not found');
          }
        } catch (err) {
          setError(err.response?.data?.error?.message || 'Failed to load job details');
        } finally {
          setLoading(false);
        }
      };
      fetchJobDetails();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Frontend validation
    if (!formData.title.trim()) return setError('Job title is required');
    if (!formData.description.trim()) return setError('Job description is required');
    if (!formData.city.trim()) return setError('City is required');
    if (!formData.wageAmount || Number(formData.wageAmount) <= 0) return setError('Please enter a valid positive wage amount');
    if (Number(formData.workersRequired) < 1) return setError('Workers required must be at least 1');

    if (formData.durationType === 'fixed_duration') {
      if (!formData.estimatedEndDate) {
        return setError('Estimated end date is required for fixed duration jobs');
      }
      if (new Date(formData.estimatedEndDate) <= new Date(formData.startDate)) {
        return setError('Estimated end date must be after start date');
      }
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      skillRequired: formData.skillRequired,
      additionalSkills: formData.additionalSkills
        ? formData.additionalSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      workersRequired: Number(formData.workersRequired),
      location: {
        city: formData.city.trim(),
        area: formData.area.trim(),
        address: formData.address.trim(),
        ...(siteLocation?.lat && siteLocation?.lng
          ? {
              coordinates: {
                type: 'Point',
                coordinates: [Number(siteLocation.lng), Number(siteLocation.lat)],
              },
            }
          : {}),
      },
      latitude: siteLocation?.lat ? Number(siteLocation.lat) : undefined,
      longitude: siteLocation?.lng ? Number(siteLocation.lng) : undefined,
      wageType: formData.wageType,
      wageAmount: Number(formData.wageAmount),
      durationType: formData.durationType,
      startDate: new Date(formData.startDate).toISOString(),
      estimatedEndDate: formData.estimatedEndDate ? new Date(formData.estimatedEndDate).toISOString() : null,
      workingHours: {
        start: formData.workingStart,
        end: formData.workingEnd,
        description: formData.workingDescription.trim(),
      },
      requirements: formData.requirements
        ? formData.requirements.split(',').map((r) => r.trim()).filter(Boolean)
        : [],
      status: formData.status,
    };

    try {
      setSubmitting(true);
      let res;
      if (isEditMode) {
        res = await updateJob(id, payload);
      } else {
        res = await createJob(payload);
      }

      if (res.success) {
        setSuccess(isEditMode ? 'Job updated successfully!' : 'Job created successfully!');
        setTimeout(() => {
          navigate('/employer/jobs');
        }, 1200);
      } else {
        setError(res.error?.message || 'Failed to save job');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'An error occurred while saving the job');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto p-12 text-center ks-glass-card my-6">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Loading job form...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12 py-2">
      <div className="ks-glass-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3.5 border-b border-slate-200/80 dark:border-white/10 pb-5">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary dark:text-sky-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Job Posting' : 'Post a New Requirement'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Fill in the details to find suitable verified gig workers with AI matching
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Job Description Assistant */}
        <AiJobDescriptionAssistant
          initialData={formData}
          onApplyDescription={(aiDraft) => {
            setFormData((prev) => ({
              ...prev,
              title: aiDraft.title || prev.title,
              description: aiDraft.description || prev.description,
              requirements: aiDraft.requirements || prev.requirements,
              skillRequired: aiDraft.skillRequired || prev.skillRequired,
              city: aiDraft.city || prev.city,
              area: aiDraft.area || prev.area,
              wageAmount: aiDraft.wageAmount || prev.wageAmount,
              wageType: aiDraft.wageType || prev.wageType,
              workersRequired: aiDraft.workersRequired || prev.workersRequired,
            }));
          }}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              1. Job Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Need 3 Electricians for Commercial Building Wiring"
                className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Job Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the scope of work, tasks, tools required..."
                className="ks-glass-input w-full p-2.5 text-xs sm:text-sm resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Required Skill <span className="text-rose-500">*</span>
                </label>
                <select
                  name="skillRequired"
                  value={formData.skillRequired}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm capitalize"
                >
                  {SKILL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workers Required <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="workersRequired"
                  min="1"
                  value={formData.workersRequired}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Skills (Comma separated)
              </label>
              <input
                type="text"
                name="additionalSkills"
                value={formData.additionalSkills}
                onChange={handleChange}
                placeholder="e.g. Conduit bending, Panel wiring"
                className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Section: Location */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              2. Work Location
            </h3>

            {/* Auto-Detect Site Location Access & Display Bar */}
            <LocationAccessBar
              activeLocation={siteLocation}
              onLocationAcquired={(loc) => {
                setSiteLocation(loc);
                setFormData((prev) => ({
                  ...prev,
                  city: loc.city || prev.city,
                  area: loc.area || prev.area,
                  address: loc.shortLabel || prev.address,
                }));
              }}
              onLocationCleared={() => {
                setSiteLocation(null);
              }}
              role="employer"
              customButtonLabel="Auto-Detect Job Site Location (GPS)"
              showRadius={false}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune, Mumbai"
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Area / Neighborhood</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="e.g. Hinjewadi Phase 1"
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Site Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Plot No 42, Next to IT Park"
                className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Section: Payment & Duration */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              3. Wages & Duration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Wage Type</label>
                <select
                  name="wageType"
                  value={formData.wageType}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                >
                  <option value="daily">Daily Wage (per day)</option>
                  <option value="weekly">Weekly Wage (per week)</option>
                  <option value="fixed">Fixed Contract Total</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Wage Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="wageAmount"
                  min="1"
                  value={formData.wageAmount}
                  onChange={handleChange}
                  placeholder="e.g. 900"
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Duration Type</label>
                <select
                  name="durationType"
                  value={formData.durationType}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                >
                  <option value="single_day">Single Day</option>
                  <option value="fixed_duration">Fixed Duration (Multi-day)</option>
                  <option value="until_completion">Until Completion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                  required
                />
              </div>

              {formData.durationType === 'fixed_duration' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Estimated End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="estimatedEndDate"
                    value={formData.estimatedEndDate}
                    onChange={handleChange}
                    className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Working Hours Start</label>
                <input
                  type="time"
                  name="workingStart"
                  value={formData.workingStart}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Working Hours End</label>
                <input
                  type="time"
                  name="workingEnd"
                  value={formData.workingEnd}
                  onChange={handleChange}
                  className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Job Requirements (Comma separated)</label>
              <input
                type="text"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                placeholder="e.g. Safety helmet, Personal tool kit, Valid ID proof"
                className="ks-glass-input w-full p-2.5 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/employer/jobs')}
              className="ks-btn-outline px-5 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ks-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : isEditMode ? 'Update Job' : 'Publish Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobPage;
