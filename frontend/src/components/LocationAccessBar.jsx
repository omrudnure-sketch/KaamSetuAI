import React, { useState } from 'react';
import { MapPin, RefreshCw, Loader2, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getCurrentPositionWithAddress,
  clearSessionLocation,
} from '../services/locationService.js';

export const LocationAccessBar = ({
  activeLocation,
  onLocationAcquired,
  onLocationCleared,
  radius,
  onRadiusChange,
  showRadius = false,
  lang = 'en',
  role = 'worker',
  customButtonLabel,
  compact = false,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const translations = {
    en: {
      detecting: 'Acquiring GPS Signal...',
      takenLocation: 'Active Location:',
      useMyLocation:
        role === 'employer'
          ? 'Find Workers Near My Location'
          : 'Find Jobs Near My Location',
      radiusLabel: 'Radius:',
      clear: 'Clear',
      refresh: 'Refresh',
      retry: 'Retry GPS',
      accuracy: 'Accuracy',
      coarseWarning: 'Approximate network location detected. On map views, drag the pin to your exact spot.',
      permDenied: 'Location permission was denied. Please allow location access in your browser or select your city manually.',
      unavailable: 'GPS signal unavailable. Please ensure device location is enabled and try again.',
      timeout: 'GPS request timed out. Please click retry to obtain a fresh location lock.',
    },
    mr: {
      detecting: 'GPS सिग्नल शोधत आहे...',
      takenLocation: 'सक्रिय स्थान:',
      useMyLocation:
        role === 'employer'
          ? 'माझ्या स्थानाजवळील कामगार शोधा'
          : 'माझ्या स्थानाजवळील कामे शोधा',
      radiusLabel: 'परिसर (Radius):',
      clear: 'स्थान काढा',
      refresh: 'रीफ्रेश करा',
      retry: 'पुन्हा प्रयत्न करा',
      accuracy: 'अचूकता',
      coarseWarning: 'अंदाजे नेटवर्क स्थान मिळाले आहे. नकाशावर पिन हलवून अचूक स्थान निश्चित करा.',
      permDenied: 'स्थान परवानगी नाकारली. कृपया ब्राऊझर सेटिंग्जमध्ये स्थान अनुमती द्या किंवा शहर निवडा.',
      unavailable: 'GPS स्थान मिळवण्यात अडचण आली. कृपया GPS चालू करा.',
      timeout: 'GPS शोधण्याची वेळ संपली. कृपया पुन्हा प्रयत्न करा.',
    },
    hi: {
      detecting: 'जीपीएस सिग्नल खोजा जा रहा है...',
      takenLocation: 'सक्रिय स्थान:',
      useMyLocation:
        role === 'employer'
          ? 'मेरे स्थान के पास मजदूर खोजें'
          : 'मेरे स्थान के पास काम खोजें',
      radiusLabel: 'दूरी (Radius):',
      clear: 'हटाएं',
      refresh: 'रिफ्रेश',
      retry: 'पुनः प्रयास करें',
      accuracy: 'सटीकता',
      coarseWarning: 'अनुमानित नेटवर्क स्थान प्राप्त हुआ। मानचित्र पर पिन खिसकाकर सटीक स्थान तय करें।',
      permDenied: 'स्थान अनुमति अस्वीकृत। कृपया ब्राउज़र में स्थान अनुमति दें या शहर चुनें।',
      unavailable: 'स्थान प्राप्त करने में असमर्थ। कृपया जीपीएस चालू करें।',
      timeout: 'स्थान का समय समाप्त हो गया। कृपया पुनः प्रयास करें।',
    },
  };

  const t = translations[lang] || translations.en;
  const buttonText = customButtonLabel || t.useMyLocation;

  const handleAcquire = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const loc = await getCurrentPositionWithAddress();
      setLoading(false);
      if (onLocationAcquired) {
        onLocationAcquired(loc);
      }
    } catch (err) {
      setLoading(false);
      if (err.code === 1) {
        setErrorMsg(t.permDenied);
      } else if (err.code === 3) {
        setErrorMsg(t.timeout);
      } else {
        setErrorMsg(err.message || t.unavailable);
      }
    }
  };

  const handleClear = () => {
    clearSessionLocation();
    setErrorMsg('');
    if (onLocationCleared) {
      onLocationCleared();
    }
  };

  // Helper to format accuracy badge label
  const formatAccuracyBadge = (acc) => {
    if (!acc && acc !== 0) return null;
    if (acc < 1000) return `±${Math.round(acc)}m`;
    return `±${(acc / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Location Access Bar & Display */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
          activeLocation
            ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {!activeLocation ? (
            <button
              type="button"
              onClick={handleAcquire}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-2xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.detecting}</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{buttonText}</span>
                </>
              )}
            </button>
          ) : (
            /* When location is taken: DISPLAYED CLEARLY NEAR THE BUTTON */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Status Indicator */}
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-extrabold shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>{t.takenLocation}</span>
              </div>

              {/* Taken Location Name & Coordinates Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-xs font-bold text-slate-800 shadow-2xs min-w-0 max-w-full">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="text-emerald-950 font-extrabold truncate">
                  {activeLocation.shortLabel || activeLocation.city || 'Detected Location'}
                </span>
                {activeLocation.formattedCoords && (
                  <span className="hidden sm:inline text-[11px] font-mono text-emerald-700/90 font-medium border-l border-emerald-200 pl-1.5">
                    {activeLocation.formattedCoords}
                  </span>
                )}
              </div>

              {/* Accuracy Metric Badge */}
              {activeLocation.accuracy !== undefined && (
                <span
                  title={`${t.accuracy}: ${activeLocation.accuracy} meters`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    activeLocation.accuracy <= 30
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : activeLocation.accuracy <= 500
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  <Navigation className="w-2.5 h-2.5" />
                  <span>{formatAccuracyBadge(activeLocation.accuracy)}</span>
                </span>
              )}

              {/* Quick Actions: Refresh & Clear */}
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcquire}
                  disabled={loading}
                  title={t.refresh}
                  className="p-1 text-slate-600 hover:text-emerald-700 rounded transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline transition-all cursor-pointer"
                >
                  {t.clear}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional Radius Controls when Location is active */}
        {activeLocation && showRadius && onRadiusChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 self-start sm:self-auto">
            <span className="font-bold text-[11px] text-slate-600">{t.radiusLabel}</span>
            {[10, 25, 50, 100].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRadiusChange(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                  radius === r
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advisory hint if coarse location is detected */}
      {activeLocation?.isCoarse && (
        <div className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>{t.coarseWarning}</span>
        </div>
      )}

      {/* Error Message with Retry option */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleAcquire}
            disabled={loading}
            className="flex-shrink-0 px-2.5 py-1 text-xs font-bold text-rose-800 hover:text-white bg-rose-100 hover:bg-rose-600 rounded-md transition-all cursor-pointer"
          >
            {t.retry}
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationAccessBar;

