import React, { useState } from 'react';
import { Sparkles, RefreshCw, Check, X, AlertCircle, Edit3 } from 'lucide-react';
import { authApiClient } from '../services/authApi.js';

export const AiJobDescriptionAssistant = ({ initialData, onApplyDescription }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Structured input form for AI assistant
  const [aiInput, setAiInput] = useState({
    title: initialData?.title || '',
    skillRequired: initialData?.skillRequired || 'electrician',
    additionalSkills: initialData?.additionalSkills || '',
    city: initialData?.city || 'Pune',
    area: initialData?.area || '',
    workersRequired: initialData?.workersRequired || 1,
    wageType: initialData?.wageType || 'daily',
    wageAmount: initialData?.wageAmount || 800,
    durationType: initialData?.durationType || 'single_day',
    startDate: initialData?.startDate || '',
    estimatedEndDate: initialData?.estimatedEndDate || '',
    workingStart: initialData?.workingStart || '09:00',
    workingEnd: initialData?.workingEnd || '18:00',
    tasks: '',
    experienceRequirements: '',
    safetyRequirements: '',
    additionalInstructions: '',
  });

  // Generated draft state
  const [draft, setDraft] = useState(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Sync from props if user opened with prefilled data
  const handleOpen = () => {
    setAiInput((prev) => ({
      ...prev,
      title: initialData?.title || prev.title,
      skillRequired: initialData?.skillRequired || prev.skillRequired,
      city: initialData?.city || prev.city,
      area: initialData?.area || prev.area,
      wageAmount: initialData?.wageAmount || prev.wageAmount,
      workersRequired: initialData?.workersRequired || prev.workersRequired,
    }));
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAiInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleDraftChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!aiInput.title.trim()) {
      return setError('Please enter a preliminary job title.');
    }
    if (!aiInput.skillRequired.trim()) {
      return setError('Please specify the required work skill.');
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: aiInput.title.trim(),
        skillRequired: aiInput.skillRequired.trim(),
        additionalSkills: aiInput.additionalSkills
          ? aiInput.additionalSkills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        location: {
          city: aiInput.city.trim() || 'Pune',
          area: aiInput.area.trim(),
        },
        workersRequired: Number(aiInput.workersRequired) || 1,
        wageType: aiInput.wageType,
        wageAmount: Number(aiInput.wageAmount) || 800,
        durationType: aiInput.durationType,
        startDate: aiInput.startDate,
        estimatedEndDate: aiInput.estimatedEndDate,
        workingHours: {
          start: aiInput.workingStart,
          end: aiInput.workingEnd,
          description: '',
        },
        tasks: aiInput.tasks
          ? aiInput.tasks.split('\n').map((t) => t.trim()).filter(Boolean)
          : [],
        experienceRequirements: aiInput.experienceRequirements.trim(),
        safetyRequirements: aiInput.safetyRequirements.trim(),
        additionalInstructions: aiInput.additionalInstructions.trim(),
      };

      const res = await authApiClient.post('/ai/job-description', payload);
      if (res.data?.success && res.data?.data) {
        setDraft(res.data.data);
        setIsEditingDraft(true);
      } else {
        setError(res.data?.error?.message || 'Failed to generate job description draft.');
      }
    } catch (err) {
      console.error('AI generator error:', err);
      setError(
        err.response?.data?.error?.message ||
          'AI generation service is temporarily unavailable. Please review inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDescription = () => {
    if (!draft) return;

    // Apply structured draft back to main form
    const combinedRequirements = [
      ...(draft.requiredSkills || []),
      ...(draft.safetyReminders || []),
      draft.experienceRequirements,
    ].filter(Boolean);

    onApplyDescription({
      title: draft.suggestedTitle,
      description: draft.description,
      requirements: combinedRequirements.join(', '),
      skillRequired: aiInput.skillRequired,
      city: aiInput.city,
      area: aiInput.area,
      wageAmount: aiInput.wageAmount,
      wageType: aiInput.wageType,
      workersRequired: aiInput.workersRequired,
    });

    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {/* Trigger Button Card */}
      {!isOpen ? (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">AI Job Description Assistant</div>
              <div className="text-xs text-slate-600">
                Let KaamSetu AI draft a complete, worker-friendly job description with safety and task details.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Assistant</span>
          </button>
        </div>
      ) : (
        /* Full AI Assistant Panel */
        <div className="p-6 bg-white border border-blue-200 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  AI Job Description Assistant
                </h3>
                <p className="text-[11px] text-slate-600">
                  Provide factual requirements below. AI will draft a complete job specification.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Job Title / Preliminary Idea *</label>
              <input
                type="text"
                name="title"
                value={aiInput.title}
                onChange={handleInputChange}
                placeholder="e.g. Residential Electrician Required"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Required Skill *</label>
              <input
                type="text"
                name="skillRequired"
                value={aiInput.skillRequired}
                onChange={handleInputChange}
                placeholder="e.g. electrician, mason, painter"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Work Location (City & Area)</label>
              <input
                type="text"
                name="city"
                value={aiInput.city}
                onChange={handleInputChange}
                placeholder="City (e.g. Pune)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Wage Rate (₹)</label>
              <input
                type="number"
                name="wageAmount"
                value={aiInput.wageAmount}
                onChange={handleInputChange}
                placeholder="Daily Wage Amount"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Main Tasks / Responsibilities (One per line)
              </label>
              <textarea
                name="tasks"
                rows={2}
                value={aiInput.tasks}
                onChange={handleInputChange}
                placeholder="e.g. Install conduit pipes&#10;Pull wires through switchboards&#10;Test circuit breakers"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Experience & Safety Notes (Optional)
              </label>
              <input
                type="text"
                name="safetyRequirements"
                value={aiInput.safetyRequirements}
                onChange={handleInputChange}
                placeholder="e.g. Must wear safety boots; insulated tools mandatory"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Generating Draft with AI...' : draft ? 'Regenerate Draft' : 'Generate Description'}</span>
            </button>
          </div>

          {/* AI-GENERATED DRAFT PREVIEW (Section 21.3, 21.4, 21.9) */}
          {draft && (
            <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3.5 mt-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-700" />
                  AI-generated draft — review and edit before publishing.
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Editable Preview</span>
              </div>

              {/* Editable Suggested Title */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Suggested Title</label>
                <input
                  type="text"
                  value={draft.suggestedTitle}
                  onChange={(e) => handleDraftChange('suggestedTitle', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Editable Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Job Description</label>
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => handleDraftChange('description', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* Responsibilities list */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Responsibilities / Tasks</label>
                <div className="space-y-1">
                  {draft.responsibilities?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Skills & Safety */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Required Skills</label>
                  <div className="flex flex-wrap gap-1">
                    {draft.requiredSkills?.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Safety Reminders</label>
                  <div className="text-[11px] text-slate-700 font-medium">
                    {draft.safetyReminders?.join(' • ') || 'Standard site precautions'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Use Description, Regenerate, Cancel */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={handleUseDescription}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Use Description (Populate Form)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiJobDescriptionAssistant;
