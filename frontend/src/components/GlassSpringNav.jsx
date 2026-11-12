import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * GlassSpringNav - Glassmorphism Spring Glide Menu, Navbar & Tab component.
 * Features:
 * - Ultra-smooth Framer-Motion-style spring physics (cubic-bezier(0.34, 1.56, 0.5, 1)).
 * - Frosted glassmorphism background with specular bevel, inner glow, and blur.
 * - Reactive active tab tracking across React Router navigation or state-driven activeKey.
 * - Automatic gliding to hovered/focused tabs and spring back to active tab on leave.
 * - Supports both horizontal (top navbar, mobile bar) and vertical (sidebar) layouts.
 * - Respects prefers-reduced-motion for full accessibility.
 */
export const GlassSpringNav = ({
  items = [],
  activeKey = null,
  onChange = null,
  variant = 'glass-light', // 'glass-light' | 'glass-dark' | 'glass-mobile' | 'glass-sidebar'
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  ariaLabel = 'Navigation menu',
  selectedLang = 'EN',
  compact = false,
  showChevron = false,
}) => {
  const location = useLocation();
  const barRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef([]);
  const [mounted, setMounted] = useState(false);

  const isVertical = orientation === 'vertical';

  // Find index of currently active item based on route or activeKey
  const getActiveIndex = useCallback(() => {
    if (!items || items.length === 0) return 0;

    // A. Controlled / in-page tab mode via activeKey
    if (activeKey !== null && activeKey !== undefined) {
      const keyIdx = items.findIndex(
        (item) => item.key === activeKey || item.id === activeKey || item.path === activeKey
      );
      return keyIdx !== -1 ? keyIdx : 0;
    }

    // B. Route-driven navigation mode via location.pathname
    // 1. Exact match
    const exactIdx = items.findIndex((item) => {
      if (item.path === location.pathname) return true;
      if (item.altPaths && item.altPaths.includes(location.pathname)) return true;
      return false;
    });
    if (exactIdx !== -1) return exactIdx;

    // 2. Sub-path match (e.g., /worker/jobs/123 matches /worker/jobs)
    const subIdx = items.findIndex((item) => {
      if (['/', '/worker', '/employer', '/admin'].includes(item.path)) return false;
      return location.pathname.startsWith(item.path);
    });
    if (subIdx !== -1) return subIdx;

    // 3. Portal root fallback
    const portalIdx = items.findIndex((item) => item.path === location.pathname);
    return portalIdx !== -1 ? portalIdx : 0;
  }, [items, activeKey, location.pathname]);

  const activeIndex = getActiveIndex();
  const [hoverIndex, setHoverIndex] = useState(null);

  // Move the glass pill indicator to target element
  const movePill = useCallback(
    (targetEl) => {
      if (!barRef.current || !pillRef.current || !targetEl) return;
      const barRect = barRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      if (isVertical) {
        const top = targetRect.top - barRect.top;
        const height = targetRect.height;
        pillRef.current.style.top = `${top}px`;
        pillRef.current.style.height = `${height}px`;
        pillRef.current.style.opacity = '1';
      } else {
        const left = targetRect.left - barRect.left;
        const width = targetRect.width;
        pillRef.current.style.left = `${left}px`;
        pillRef.current.style.width = `${width}px`;
        pillRef.current.style.opacity = '1';
      }
    },
    [isVertical]
  );

  const syncActivePill = useCallback(() => {
    const targetIdx = hoverIndex !== null ? hoverIndex : activeIndex;
    const el = itemRefs.current[targetIdx];
    if (el) {
      movePill(el);
    }
  }, [hoverIndex, activeIndex, movePill]);

  // Sync pill when activeIndex or hoverIndex changes
  useEffect(() => {
    syncActivePill();
  }, [syncActivePill, activeIndex, hoverIndex]);

  // Recalculate on mount and resize
  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      syncActivePill();
    };

    window.addEventListener('resize', handleResize);
    const rafId = typeof window !== 'undefined' ? window.requestAnimationFrame(() => {
      syncActivePill();
    }) : null;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (typeof window !== 'undefined' && rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [syncActivePill]);

  // Style configurations
  const isDark = variant === 'glass-dark';
  const isMobile = variant === 'glass-mobile';
  const isSidebar = variant === 'glass-sidebar' || isVertical;

  // Container styling
  let containerClasses = 'ks-glass-bar';
  if (isDark) containerClasses = 'ks-glass-bar-dark';
  else if (isMobile) containerClasses = 'ks-glass-bar-mobile';
  else if (isSidebar) containerClasses = 'ks-glass-bar-vertical';

  // Pill indicator styling
  let pillClasses = 'ks-glass-pill';
  if (isDark) pillClasses = 'ks-glass-pill-dark';
  else if (isMobile) pillClasses = 'ks-glass-pill-mobile';
  else if (isSidebar) pillClasses = 'ks-glass-pill-vertical';

  return (
    <nav
      ref={barRef}
      onPointerLeave={() => {
        setHoverIndex(null);
        const activeEl = itemRefs.current[activeIndex];
        if (activeEl) movePill(activeEl);
      }}
      className={`relative isolate select-none transition-all duration-300 max-w-full ${
        isVertical ? 'flex flex-col gap-1 w-full' : 'flex items-center'
      } ${containerClasses} ${className}`}
      aria-label={ariaLabel}
    >
      {/* Animated Spring Glide Glass Pill */}
      <span
        ref={pillRef}
        className={`absolute z-0 pointer-events-none ${
          isVertical ? 'inset-x-1 left-1 right-1 rounded-xl' : 'inset-y-1 left-1 rounded-full'
        } ${pillClasses} ${mounted ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      {/* Nav Menu Links or Tab Buttons */}
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const IconComponent = typeof item.icon === 'function' ? item.icon : null;
        const iconString = typeof item.icon === 'string' ? item.icon : null;

        const displayLabel =
          selectedLang === 'म' && item.marathiLabel ? item.marathiLabel : item.label;

        // Size & Layout classes
        let linkClass = 'px-3.5 py-1.5 text-xs sm:text-sm';
        if (size === 'sm') linkClass = 'px-2 py-1 text-[11px]';
        if (size === 'lg') linkClass = 'px-4 py-2 text-xs sm:text-sm';
        if (size === 'adaptive') linkClass = 'px-2 lg:px-2.5 xl:px-3.5 py-1 text-xs xl:text-sm';
        if (isMobile) linkClass = 'px-2 py-1 text-[10px] flex-col flex-1 min-w-[46px]';
        if (isVertical) {
          linkClass = 'px-4 py-2.5 text-xs sm:text-sm w-full justify-between rounded-xl';
        }

        const commonProps = {
          ref: (el) => (itemRefs.current[index] = el),
          onPointerEnter: () => {
            setHoverIndex(index);
            movePill(itemRefs.current[index]);
          },
          onFocus: () => {
            setHoverIndex(index);
            movePill(itemRefs.current[index]);
          },
          'aria-current': isActive ? 'page' : undefined,
          className: `relative z-[1] flex items-center ${
            isVertical ? 'justify-between' : 'justify-center'
          } gap-1.5 xl:gap-2 rounded-full no-underline font-bold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer whitespace-nowrap flex-shrink-0 ${linkClass} ${
            isActive
              ? 'text-primary dark:text-sky-300 font-black'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
          }`,
        };

        const content = (
          <>
            <div className={`flex items-center gap-1.5 xl:gap-2 min-w-0 ${isMobile ? 'flex-col gap-0.5' : ''}`}>
              {IconComponent && (
                <IconComponent
                  className={`flex-shrink-0 transition-transform ${
                    isMobile ? 'w-4 h-4' : 'w-4 h-4'
                  } ${isActive ? 'scale-110 text-primary dark:text-sky-300' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}
                />
              )}

              {iconString && (
                <span
                  className={`material-symbols-outlined flex-shrink-0 leading-none transition-transform ${
                    isMobile ? 'text-[20px]' : 'text-[18px]'
                  } ${isActive ? 'scale-110 text-primary dark:text-sky-300' : 'text-slate-400 dark:text-slate-400'}`}
                >
                  {iconString}
                </span>
              )}

              {(!compact || isMobile || isVertical) && displayLabel && (
                <span className="truncate tracking-tight">{displayLabel}</span>
              )}
            </div>

            {/* Right badge or Chevron (for sidebar or tagged items) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isVertical && showChevron && isActive && (
                <span className="material-symbols-outlined text-[15px] text-slate-400">
                  chevron_right
                </span>
              )}
            </div>
          </>
        );

        // If path is provided, render Link; otherwise render button for stateful tabs
        if (item.path) {
          return (
            <Link key={item.path || item.label} to={item.path} {...commonProps}>
              {content}
            </Link>
          );
        }

        return (
          <button
            type="button"
            key={item.key || item.id || item.label}
            onClick={() => {
              if (onChange) onChange(item.key || item.id);
              if (item.onClick) item.onClick();
            }}
            {...commonProps}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
};
