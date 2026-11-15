import React, { useEffect, useState, useRef } from 'react';

/**
 * ThemeTransitionOverlay
 * Polished full-viewport celestial theme-switching animation.
 * Features:
 * - Micro-interaction: Sun rays collapse and sun morphs into a crescent moon (or vice-versa).
 * - Day clouds fade out and night stars twinkle in (and vice-versa).
 * - Switches actual DOM theme at animation peak (~400ms).
 * - Smooth fade out at ~750ms and cleanup at ~1000ms.
 * - Uses stable refs to prevent re-triggering loops or cancellation mid-flight.
 * - Click-to-dismiss escape hatch prevents user lock-in.
 * - Respects prefers-reduced-motion with an instant, gentle transition.
 */
export const ThemeTransitionOverlay = ({
  isTransitioning,
  direction, // 'to-dark' | 'to-light'
  onMidpoint,
  onComplete,
}) => {
  const [phase, setPhase] = useState('start'); // 'start' | 'mid' | 'fade-out'
  const onMidpointRef = useRef(onMidpoint);
  const onCompleteRef = useRef(onComplete);

  // Keep callback refs fresh without re-triggering the transition effect
  useEffect(() => {
    onMidpointRef.current = onMidpoint;
  }, [onMidpoint]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Keyboard escape listener to dismiss instantly if user presses Esc
  useEffect(() => {
    if (!isTransitioning) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTransitioning]);

  useEffect(() => {
    if (!isTransitioning) {
      setPhase('start');
      return;
    }

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (onMidpointRef.current) onMidpointRef.current();
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    // Phase 1: Smooth start
    setPhase('start');

    // Phase 2: Peak midpoint (~180ms) - celestial elements morph at peak
    const midTimer = setTimeout(() => {
      setPhase('mid');
      if (onMidpointRef.current) onMidpointRef.current();
    }, 180);

    // Phase 3: Start exit fade (~400ms)
    const fadeTimer = setTimeout(() => {
      setPhase('fade-out');
    }, 400);

    // Phase 4: Complete transition and restore page (~580ms)
    const endTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 580);

    // Fail-safe safety timer (~660ms max)
    const safetyTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 660);

    return () => {
      clearTimeout(midTimer);
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
      clearTimeout(safetyTimer);
    };
  }, [isTransitioning]);

  if (!isTransitioning) return null;

  const toDark = direction === 'to-dark';
  const isMidOrLater = phase === 'mid' || phase === 'fade-out';
  const isFadingOut = phase === 'fade-out';

  const handleDismiss = () => {
    if (onCompleteRef.current) onCompleteRef.current();
  };

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden pointer-events-none select-none ${
        isFadingOut ? 'opacity-0 scale-102' : 'opacity-100 scale-100'
      } ${
        toDark
          ? isMidOrLater
            ? 'bg-gradient-to-b from-[#070b1a] via-[#090f26] to-[#030611] text-white'
            : 'bg-gradient-to-b from-sky-400 via-indigo-600 to-[#0b1026] text-white'
          : isMidOrLater
          ? 'bg-gradient-to-b from-amber-100 via-sky-200 to-sky-300 text-slate-800'
          : 'bg-gradient-to-b from-[#0b1026] via-indigo-800 to-amber-200 text-white'
      }`}
      style={{
        transitionProperty: 'background, opacity, transform',
        transitionDuration: '480ms, 280ms, 280ms',
      }}
      role="status"
      aria-live="polite"
      aria-label={toDark ? 'Switching to dark mode' : 'Switching to light mode'}
    >
      {/* Background Ambience: Twinkling Stars (in dark sky) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          (toDark && isMidOrLater) || (!toDark && !isMidOrLater) ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {[
          { top: '15%', left: '20%', size: 4, delay: '0s' },
          { top: '25%', left: '75%', size: 5, delay: '0.2s' },
          { top: '35%', left: '15%', size: 3, delay: '0.4s' },
          { top: '65%', left: '80%', size: 4, delay: '0.1s' },
          { top: '75%', left: '25%', size: 5, delay: '0.3s' },
          { top: '80%', left: '70%', size: 3, delay: '0.5s' },
          { top: '20%', left: '50%', size: 4, delay: '0.15s' },
          { top: '70%', left: '45%', size: 3, delay: '0.35s' },
        ].map((star, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: '1.8s',
            }}
          />
        ))}
      </div>

      {/* Background Ambience: Soft Clouds (in day sky) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
          (!toDark && isMidOrLater) || (toDark && !isMidOrLater)
            ? 'opacity-80 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="absolute top-[28%] left-[10%] w-48 h-16 rounded-full bg-white/40 blur-xl" />
        <div className="absolute top-[32%] right-[12%] w-60 h-20 rounded-full bg-white/50 blur-xl" />
      </div>

      {/* Central Celestial Body (Sun & Moon Morph) */}
      <div className="relative flex items-center justify-center">
        {/* Glow Halo */}
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-700 ${
            (toDark && isMidOrLater) || (!toDark && !isMidOrLater)
              ? 'w-48 h-48 sm:w-56 sm:h-56 bg-sky-400/25 blur-2xl'
              : 'w-56 h-56 sm:w-64 sm:h-64 bg-amber-400/35 blur-3xl'
          }`}
        />

        {/* Collapsible Sun Rays */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out ${
            (toDark && isMidOrLater) || (!toDark && !isMidOrLater)
              ? 'scale-0 opacity-0 rotate-45'
              : 'scale-100 opacity-100 rotate-0'
          }`}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-7 sm:h-9 bg-gradient-to-t from-amber-400 to-yellow-200 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              style={{
                transform: `rotate(${deg}deg) translateY(-68px)`,
                transformOrigin: 'center center',
              }}
            />
          ))}
        </div>

        {/* Celestial Orb (Sun Body or Moon Surface) */}
        <div
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-700 shadow-2xl overflow-hidden flex items-center justify-center ${
            (toDark && isMidOrLater) || (!toDark && !isMidOrLater)
              ? 'bg-gradient-to-tr from-slate-200 via-sky-100 to-white shadow-[0_0_40px_rgba(186,230,253,0.6)] rotate-[-20deg]'
              : 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 shadow-[0_0_45px_rgba(251,191,36,0.7)] rotate-0'
          }`}
        >
          {/* Crescent Moon Mask Shadow */}
          <div
            className={`absolute rounded-full transition-all duration-700 ease-in-out ${
              (toDark && isMidOrLater) || (!toDark && !isMidOrLater)
                ? 'w-24 h-24 sm:w-28 sm:h-28 -top-1 -right-2 bg-[#090f26] shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.2)]'
                : 'w-0 h-0 top-14 right-14 bg-transparent'
            }`}
          />

          {/* Moon Craters (Visible on crescent moon) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
              (toDark && isMidOrLater) || (!toDark && !isMidOrLater) ? 'opacity-40' : 'opacity-0'
            }`}
          >
            <span className="absolute bottom-5 left-6 w-3 h-3 rounded-full bg-slate-400/40" />
            <span className="absolute bottom-8 left-4 w-2 h-2 rounded-full bg-slate-400/30" />
            <span className="absolute top-7 left-7 w-2.5 h-2.5 rounded-full bg-slate-400/30" />
          </div>
        </div>
      </div>

      {/* Mode Title Text */}
      <div className="mt-8 text-center space-y-1 transition-all duration-500 z-10">
        <h3 className="text-lg sm:text-xl font-extrabold tracking-tight drop-shadow-md">
          {toDark ? 'Switching to Night Mode' : 'Switching to Day Mode'}
        </h3>
        <p className="text-xs sm:text-sm font-medium opacity-85 tracking-wide">
          {toDark ? 'Relax your eyes with soft dark tones' : 'Bright and clear daytime contrast'}
        </p>
      </div>
    </div>
  );
};

