import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Helper to determine if the given pathname is a root home or auth route
 * where back buttons should NEVER be displayed.
 */
export const isRootOrAuthPage = (pathname) => {
  if (!pathname) return true;
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  return [
    '/',
    '/worker',
    '/employer',
    '/admin',
    '/admin/dashboard',
    '/login',
    '/register',
  ].includes(cleanPath);
};

/**
 * Animated Back Button with fluid spring micro-interactions, liquid-glass shimmer,
 * tactile click scaling, and intelligent route fallback detection.
 */
export const BackButton = ({
  to,
  fallback,
  label,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'glass', // 'glass' | 'solid' | 'subtle' | 'pill'
  showIcon = true,
  showLabel = true,
  pulseDot = false,
  onClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isPressed, setIsPressed] = useState(false);

  // If this is a root or auth page and no explicit "to" prop was passed, do not render
  if (!to && isRootOrAuthPage(location.pathname)) {
    return null;
  }

  // Compute smart fallback target and dynamic label
  const getSmartNavigation = () => {
    const path = location.pathname;

    // Default authenticated home boundary based on active user role
    const roleHome =
      user?.role === 'employer'
        ? '/employer'
        : user?.role === 'admin'
        ? '/admin'
        : user?.role === 'worker'
        ? '/worker'
        : '/';

    // Worker portal routes
    if (path.startsWith('/worker/jobs/map') || path.startsWith('/worker/jobs/')) {
      return { target: '/worker/jobs', defaultLabel: 'Back to Jobs' };
    }
    if (path.startsWith('/worker/hiring/') || path.startsWith('/worker/hirings/')) {
      return { target: '/worker/hiring', defaultLabel: 'Back to Hiring List' };
    }
    if (path.startsWith('/worker/projects/')) {
      return { target: '/worker/projects', defaultLabel: 'Back to Projects' };
    }
    if (path.startsWith('/worker/messages/')) {
      return { target: '/worker/messages', defaultLabel: 'Back to Messages' };
    }
    if (path.startsWith('/worker/complaints/')) {
      return { target: '/worker/complaints', defaultLabel: 'Back to Help & Complaints' };
    }
    if (path.startsWith('/worker/disputes/')) {
      return { target: '/worker/disputes', defaultLabel: 'Back to Disputes' };
    }
    if (path.startsWith('/worker/')) {
      return { target: '/worker', defaultLabel: 'Back to Worker Dashboard' };
    }

    // Employer portal routes
    if (path.startsWith('/employer/jobs/create') || path.startsWith('/employer/jobs/new')) {
      return { target: '/employer/jobs', defaultLabel: 'Back to My Jobs' };
    }
    if (path.startsWith('/employer/jobs/') && path.includes('/applications')) {
      return { target: '/employer/jobs', defaultLabel: 'Back to My Jobs' };
    }
    if (path.startsWith('/employer/jobs/')) {
      return { target: '/employer/jobs', defaultLabel: 'Back to My Jobs' };
    }
    if (path.startsWith('/employer/workers/map') || path.startsWith('/employer/workers/')) {
      return { target: '/employer/workers', defaultLabel: 'Back to Workers Search' };
    }
    if (path.startsWith('/employer/hiring/') || path.startsWith('/employer/hirings/')) {
      return { target: '/employer/hiring', defaultLabel: 'Back to Hiring List' };
    }
    if (path.startsWith('/employer/projects/')) {
      return { target: '/employer/projects', defaultLabel: 'Back to Projects' };
    }
    if (path.startsWith('/employer/messages/')) {
      return { target: '/employer/messages', defaultLabel: 'Back to Messages' };
    }
    if (path.startsWith('/employer/complaints/')) {
      return { target: '/employer/complaints', defaultLabel: 'Back to Complaints' };
    }
    if (path.startsWith('/employer/disputes/')) {
      return { target: '/employer/disputes', defaultLabel: 'Back to Disputes' };
    }
    if (path.startsWith('/employer/')) {
      return { target: '/employer', defaultLabel: 'Back to Employer Dashboard' };
    }

    // Admin portal routes
    if (path.startsWith('/admin/')) {
      return { target: '/admin', defaultLabel: 'Back to Admin Dashboard' };
    }

    return { target: roleHome, defaultLabel: 'Back' };
  };

  const smartNav = getSmartNavigation();
  const effectiveTarget = to || fallback || smartNav.target;
  const effectiveLabel = label || smartNav.defaultLabel;

  const handleBack = (e) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }

    if (to) {
      navigate(to);
      return;
    }

    // Always navigate to safe portal-contained target to prevent history popping to /login or /
    navigate(effectiveTarget);
  };

  // Size styling variants
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-xl',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2 rounded-xl',
    lg: 'text-sm sm:text-base px-4.5 py-2.5 gap-2.5 rounded-2xl font-bold',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  // Visual appearance variants
  const variantStyles = {
    glass:
      'border border-slate-200/90 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-sky-300 hover:border-primary/50 dark:hover:border-sky-500/50 shadow-xs hover:shadow-[0_8px_24px_-6px_rgba(37,99,235,0.3)] dark:hover:shadow-[0_8px_24px_-6px_rgba(56,189,248,0.25)]',
    solid:
      'border border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md',
    subtle:
      'border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10',
    pill:
      'border border-slate-200/90 dark:border-white/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl text-slate-800 dark:text-white rounded-full px-4 py-2 shadow-md hover:shadow-lg hover:border-primary/60 hover:-translate-y-1',
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      title={effectiveLabel}
      aria-label={effectiveLabel}
      className={`group relative inline-flex items-center font-semibold cursor-pointer select-none transition-all duration-300 ease-out overflow-hidden active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:focus-visible:ring-sky-400/50 ${
        isPressed ? 'scale-95' : 'hover:-translate-y-0.5'
      } ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.glass} ${className}`}
    >
      {/* Liquid Glass Shimmer Sweep on Hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full"
      />

      {/* Subtle Pulsing Beacon Dot */}
      {pulseDot && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary dark:bg-sky-400" />
        </span>
      )}

      {/* Animated Arrow Icon with Spring Glide & Bounce */}
      {showIcon && (
        <span className="relative flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-x-1 group-active:-translate-x-2">
          <ArrowLeft className={`${iconSizes[size] || iconSizes.md} shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-sky-300 transition-colors duration-200`} />
        </span>
      )}

      {/* Label with dynamic text hover shift */}
      {showLabel && (
        <span className="relative tracking-tight transition-colors duration-200 font-bold text-xs sm:text-sm">
          {effectiveLabel}
        </span>
      )}
    </button>
  );
};

/**
 * Smart Back Navigation Bar designed for layouts (MainLayout & AdminLayout).
 * Renders on all portal sub-routes (NOT on home/dashboard/auth pages),
 * displaying an animated back button and responsive portal-scoped breadcrumbs.
 */
export const SmartBackBar = ({ className = '' }) => {
  const location = useLocation();
  const path = location.pathname;

  // Never render on home pages, dashboards, or auth pages
  if (isRootOrAuthPage(path)) {
    return null;
  }

  // Determine portal root and human-friendly title
  let portalHome = '/';
  let portalLabel = 'Home';

  if (path.startsWith('/worker')) {
    portalHome = '/worker';
    portalLabel = 'Worker Workspace';
  } else if (path.startsWith('/employer')) {
    portalHome = '/employer';
    portalLabel = 'Employer Hub';
  } else if (path.startsWith('/admin')) {
    portalHome = '/admin';
    portalLabel = 'Admin Dashboard';
  }

  // Generate breadcrumb items
  const pathSegments = path.split('/').filter(Boolean);

  // Filter out leading portal prefix so breadcrumbs are clean (e.g., Worker Workspace > Jobs)
  const displaySegments = ['worker', 'employer', 'admin'].includes(pathSegments[0])
    ? pathSegments.slice(1)
    : pathSegments;

  // Format readable breadcrumb label
  const formatLabel = (seg) => {
    if (seg === 'jobs') return 'Jobs';
    if (seg === 'workers') return 'Workers';
    if (seg === 'projects') return 'Projects';
    if (seg === 'hiring' || seg === 'hirings') return 'Hirings';
    if (seg === 'applications') return 'Applications';
    if (seg === 'invitations') return 'Invitations';
    if (seg === 'earnings') return 'Earnings';
    if (seg === 'payments') return 'Payments';
    if (seg === 'messages') return 'Messages';
    if (seg === 'profile') return 'Profile';
    if (seg === 'notifications') return 'Notifications';
    if (seg === 'complaints') return 'Complaints';
    if (seg === 'disputes') return 'Disputes';
    if (seg === 'map') return 'Map Search';
    if (seg === 'create' || seg === 'new') return 'Create';
    if (seg === 'edit') return 'Edit';
    if (seg === 'analytics') return 'Analytics';
    if (seg === 'reports') return 'Reports';
    if (seg === 'settings') return 'Settings';
    if (seg === 'audit-logs') return 'Audit Logs';
    if (seg === 'verifications') return 'Verifications';
    if (seg === 'fraud-risk') return 'Fraud Risk';
    if (seg === 'ai-assistant') return 'AI Assistant';

    // If UUID or hash ID, truncate cleanly
    if (seg.length > 15) {
      return `#${seg.slice(0, 8)}...`;
    }
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  };

  return (
    <div
      className={`w-full mb-3 sm:mb-5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 py-1 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <BackButton size="md" variant="glass" />
      </div>

      {/* Breadcrumb path for easy orientation - strictly contained within portal */}
      <nav
        aria-label="Breadcrumb"
        className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium overflow-hidden bg-slate-100/60 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/10"
      >
        <Link
          to={portalHome}
          className="inline-flex items-center gap-1 hover:text-primary dark:hover:text-sky-400 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{portalLabel}</span>
        </Link>

        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const prefix = ['worker', 'employer', 'admin'].includes(pathSegments[0]) ? `/${pathSegments[0]}` : '';
          const toPath = `${prefix}/${displaySegments.slice(0, index + 1).join('/')}`;

          return (
            <React.Fragment key={toPath}>
              <ChevronLeft className="w-3 h-3 rotate-180 text-slate-400 dark:text-slate-500 shrink-0" />
              {isLast ? (
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                  {formatLabel(segment)}
                </span>
              ) : (
                <Link
                  to={toPath}
                  className="hover:text-primary dark:hover:text-sky-400 transition-colors truncate max-w-[140px]"
                >
                  {formatLabel(segment)}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

/**
 * Floating Quick-Back Button that stays accessible when scrolling,
 * with bouncing pulse motion, liquid-glass blur, and smooth entrance.
 * Excluded entirely from home, dashboard, and auth pages.
 */
export const FloatingBackButton = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  // Don't show floating back on home or auth pages
  const isExcluded = isRootOrAuthPage(location.pathname);

  useEffect(() => {
    if (isExcluded) {
      setVisible(false);
      return;
    }

    const handleScroll = () => {
      // Appear once user scrolls down > 160px
      if (window.scrollY > 160) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExcluded]);

  if (isExcluded || !visible) {
    return null;
  }

  return (
    <aside
      aria-label="Quick back navigation"
      className="fixed bottom-20 left-4 sm:left-6 z-[990] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <BackButton
        size="md"
        variant="pill"
        showLabel={true}
        label="Back"
        pulseDot={true}
        className="!shadow-[0_12px_28px_-6px_rgba(15,23,42,0.25)] dark:!shadow-[0_12px_28px_-6px_rgba(0,0,0,0.6)] !border-slate-300/80 dark:!border-white/20 !bg-white/95 dark:!bg-slate-900/95"
      />
    </aside>
  );
};

export default BackButton;
