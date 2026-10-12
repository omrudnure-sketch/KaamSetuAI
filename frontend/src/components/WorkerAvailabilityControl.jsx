import React, { useState, useEffect } from 'react';
import { updateWorkerAvailability, fetchWorkerProfile } from '../services/profileApi.js';
import { workerTranslations } from '../utils/workerTranslations.js';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const WorkerAvailabilityControl = ({
  initialIsAvailable = null,
  lang = 'en',
  onStatusChange = null,
  compact = false,
}) => {
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable ?? true);
  const [loading, setLoading] = useState(initialIsAvailable === null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const t = workerTranslations[lang] || workerTranslations.en;

  useEffect(() => {
    if (initialIsAvailable === null) {
      let isMounted = true;
      fetchWorkerProfile()
        .then((res) => {
          if (isMounted && res.success && res.data?.profile) {
            const profile = res.data.profile;
            const available = profile.isAvailableForWork ?? (profile.availability !== 'unavailable');
            setIsAvailable(available);
          }
        })
        .catch(() => {
          // If error, default to true
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setIsAvailable(initialIsAvailable);
      setLoading(false);
    }
  }, [initialIsAvailable]);

  const handleToggle = async (targetStatus) => {
    if (saving || isAvailable === targetStatus) return;

    const previousStatus = isAvailable;
    setIsAvailable(targetStatus); // Optimistic UI update
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await updateWorkerAvailability({
        isAvailableForWork: targetStatus,
        availability: targetStatus ? 'available' : 'unavailable',
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          message: t.availabilityUpdated || 'Status updated!',
        });
        if (onStatusChange) {
          onStatusChange(targetStatus);
        }
      } else {
        // Roll back optimistic state on failure
        setIsAvailable(previousStatus);
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to update availability status',
        });
      }
    } catch (err) {
      // Roll back optimistic state on failure
      setIsAvailable(previousStatus);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || err.message || 'Network error while updating status',
      });
    } finally {
      setSaving(false);
      setTimeout(() => {
        setFeedback({ type: '', message: '' });
      }, 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-white/70 rounded-xl border border-slate-200 animate-pulse text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Loading availability...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => handleToggle(true)}
          disabled={saving}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isAvailable
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
          <span>{t.readyForWork}</span>
        </button>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          disabled={saving}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !isAvailable
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${!isAvailable ? 'bg-white' : 'bg-rose-400'}`} />
          <span>{t.notAvailable}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <h3 className="text-base font-extrabold text-slate-900">{t.availability}</h3>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isAvailable ? t.readyForWork : t.notAvailable}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            {t.availabilityToggleDesc}
          </p>
        </div>

        {/* Action Toggle Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleToggle(true)}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              isAvailable
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.readyForWork}</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggle(false)}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              !isAvailable
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{t.notAvailable}</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback.message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};

export default WorkerAvailabilityControl;
