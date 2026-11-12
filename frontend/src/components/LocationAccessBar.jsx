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
      detecting: 'Detecting GPS & Area...',
      takenLocation: 'Taken Location:',
      useMyLocation:
        role === 'employer'
          ? 'Find Workers Near My Location'
          : 'Find Jobs Near My Location',
      radiusLabel: 'Radius:',
      clear: 'Clear',
      refresh: 'Refresh',
      accuracy: 'Accuracy',
      permDenied: 'Location permission was denied. You can manually enter city above.',
      unavailable: 'Unable to acquire GPS location. Please check your network or device GPS.',
    },
    mr: {
      detecting: 'स्थान शोधत आहे...',
      takenLocation: 'प्राप्त केलेले स्थान:',
      useMyLocation:
        role === 'employer'
          ? 'माझ्या स्थानाजवळील कामगार शोधा'
          : 'माझ्या स्थानाजवळील कामे शोधा',
      radiusLabel: 'परिसर (Radius):',
      clear: 'स्थान काढा',
      refresh: 'रीफ्रेश करा',
      accuracy: 'अचूकता',
      permDenied: 'स्थान परवानगी नाकारली. कृपया वर शहर निवडा.',
      unavailable: 'स्थान मिळवण्यात अडचण आली. कृपया GPS चालू करा.',
    },
    hi: {
      detecting: 'स्थान पता लगाया जा रहा है...',
      takenLocation: 'प्राप्त स्थान:',
      useMyLocation:
        role === 'employer'
          ? 'मेरे स्थान के पास मजदूर खोजें'
          : 'मेरे स्थान के पास काम खोजें',
      radiusLabel: 'दूरी (Radius):',
      clear: 'हटाएं',
      refresh: 'रिफ्रेश',
      accuracy: 'सटीकता',
      permDenied: 'स्थान अनुमति अस्वीकृत। आप ऊपर शहर दर्ज कर सकते हैं।',
      unavailable: 'स्थान प्राप्त करने में असमर्थ। कृपया जीपीएस जांचें।',
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
      } else {
        setErrorMsg(t.unavailable);
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

      {/* Error Message if GPS permission is denied */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default LocationAccessBar;

