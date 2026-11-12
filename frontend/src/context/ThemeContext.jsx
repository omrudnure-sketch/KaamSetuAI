import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ThemeTransitionOverlay } from '../components/ThemeTransitionOverlay.jsx';

const THEME_STORAGE_KEY = 'kaamsetu-theme';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  isTransitioning: false,
  toggleTheme: () => {},
  setThemeDirect: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize from document data-theme (set by anti-flash script in index.html) or localStorage or OS
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore localStorage access issues
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('to-dark');
  const targetThemeRef = useRef(theme === 'light' ? 'dark' : 'light');

  // Synchronize theme to DOM root and body instantly
  const applyThemeToDOM = useCallback((newTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', newTheme);
    root.style.colorScheme = newTheme;

    if (newTheme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
    }
  }, []);

  // Save to localStorage safely
  const persistTheme = useCallback((newTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors in restricted iframe/private mode
    }
  }, []);

  // Set theme directly without full-screen transition (e.g. cross-tab sync or OS change)
  const setThemeDirect = useCallback(
    (newTheme) => {
      const targetTheme = newTheme === 'dark' ? 'dark' : 'light';
      targetThemeRef.current = targetTheme;
      applyThemeToDOM(targetTheme);
      persistTheme(targetTheme);
      setTheme(targetTheme);
    },
    [applyThemeToDOM, persistTheme]
  );

  // Toggle theme immediately and reliably with smooth visual celestial transition
  const toggleTheme = useCallback(() => {
    // Dismiss any existing transition immediately
    setIsTransitioning(false);

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    targetThemeRef.current = nextTheme;

    // 1. Instantly apply theme to DOM, storage, and state synchronously so it can NEVER get stuck
    applyThemeToDOM(nextTheme);
    persistTheme(nextTheme);
    setTheme(nextTheme);

    // 2. Trigger non-blocking celestial transition flourish
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      setTransitionDirection(nextTheme === 'dark' ? 'to-dark' : 'to-light');
      setIsTransitioning(true);
    }
  }, [theme, applyThemeToDOM, persistTheme]);

  // Guaranteed fail-safe timer: unmount transition overlay after 320ms maximum
  useEffect(() => {
    if (isTransitioning) {
      const safetyTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 320);
      return () => clearTimeout(safetyTimer);
    }
  }, [isTransitioning]);

  // Handle midpoint of transition (redundant safety sync)
  const handleTransitionMidpoint = useCallback(() => {
    const currentTarget = targetThemeRef.current;
    applyThemeToDOM(currentTarget);
    persistTheme(currentTarget);
  }, [applyThemeToDOM, persistTheme]);

  // Handle completion of transition (unmount overlay)
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  // Ensure DOM is synced on initial mount
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
        applyThemeToDOM(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyThemeToDOM]);

  // Listen for OS system theme changes if user hasn't explicitly saved a choice
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      try {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          const sysTheme = e.matches ? 'dark' : 'light';
          setTheme(sysTheme);
          applyThemeToDOM(sysTheme);
        }
      } catch {
        // Ignore
      }
    };

    mql.addEventListener('change', handleSystemChange);
    return () => mql.removeEventListener('change', handleSystemChange);
  }, [applyThemeToDOM]);

  const value = {
    theme,
    isDark: theme === 'dark',
    isTransitioning,
    toggleTheme,
    setThemeDirect,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {/* Full-screen celestial theme transition overlay */}
      <ThemeTransitionOverlay
        isTransitioning={isTransitioning}
        direction={transitionDirection}
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
    </ThemeContext.Provider>
  );
};

