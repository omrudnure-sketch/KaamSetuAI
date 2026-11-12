import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * ThemeToggleButton
 * Interactive sun-to-moon theme switcher with smooth micro-interactions.
 * - In light mode: displays a radiant sun with rotating solar aura.
 * - In dark mode: displays a sleek crescent moon with subtle starry glow.
 * - Fully accessible: aria-label, aria-pressed, keyboard focusable.
 */
export const ThemeToggleButton = ({
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = false,
}) => {
  const { isDark, toggleTheme, isTransitioning } = useTheme();

  // Size configurations
  let btnSize = 'w-10 h-10';
  let iconSize = 'w-4.5 h-4.5';
  if (size === 'sm') {
    btnSize = 'w-8 h-8';
    iconSize = 'w-3.5 h-3.5';
  } else if (size === 'lg') {
    btnSize = 'w-12 h-12 sm:w-13 sm:h-13';
    iconSize = 'w-6 h-6 sm:w-6.5 sm:h-6.5';
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode (Day)' : 'Switch to dark mode (Night)'}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none cursor-pointer group ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700/80 text-sky-300 border border-slate-700/80 shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
          : 'bg-white hover:bg-amber-50/80 text-amber-500 border border-slate-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.15),inset_0_1px_0_#ffffff]'
      } ${btnSize} ${className}`}
    >
      {/* Subtle hover pulse aura */}
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100 blur-sm pointer-events-none ${
          isDark ? 'bg-sky-500/20' : 'bg-amber-400/25'
        }`}
      />

      {/* Animated Icon Container */}
      <div
        className={`relative flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.5,1)] ${
          isDark ? 'rotate-[360deg] scale-100' : 'rotate-0 scale-100'
        }`}
      >
        {isDark ? (
          // Crescent Moon Icon
          <svg
            className={`${iconSize} transition-transform group-hover:scale-110 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.2" />
            <path d="M19 3v4" strokeWidth="1.5" />
            <path d="M21 5h-4" strokeWidth="1.5" />
          </svg>
        ) : (
          // Radiant Sun Icon
          <svg
            className={`${iconSize} transition-transform group-hover:scale-110 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        )}
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-bold truncate">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

