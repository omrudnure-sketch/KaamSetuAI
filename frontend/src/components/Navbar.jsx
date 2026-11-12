import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { KaamSetuLogo } from './KaamSetuLogo.jsx';
import { GlassSpringNav } from './GlassSpringNav.jsx';
import { ThemeToggleButton } from './ThemeToggleButton.jsx';
import {
  Menu,
  X,
  ChevronDown,
  Bell,
  LogOut,
  User,
  Shield,
  Briefcase,
  Layers,
  MessageSquare,
  DollarSign,
  FileText,
  Mail,
  Handshake,
  HelpCircle,
  AlertTriangle,
  MapPin,
  PlusCircle,
  Home,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { getUnreadNotificationCount } from '../services/notificationService.js';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { isDark } = useTheme();

  const [selectedLang, setSelectedLang] = useState('EN');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef(null);
  const drawerRef = useRef(null);

  // Load unread notifications count for authenticated users
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await getUnreadNotificationCount();
        const count = res?.count ?? res?.data?.count ?? 0;
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (err) {
        // Silently catch in navbar
      }
    };
    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, [user, location.pathname]);

  // Close menus on route navigation
  useEffect(() => {
    setShowUserMenu(false);
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Click outside listener for desktop user dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Escape key handler for drawer & user menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    setMobileDrawerOpen(false);
    await logout();
    navigate('/login');
  };

  // Define desktop and mobile navigation items based on role
  let navItems = [
    { path: '/', label: 'Home', marathiLabel: 'मुख्य', icon: 'home' },
    { path: '/worker', label: 'Worker Portal', marathiLabel: 'कामगार', icon: 'handyman' },
    { path: '/employer', label: 'Employer Portal', marathiLabel: 'नियोक्ता', icon: 'business' },
    { path: '/login', label: 'Login', marathiLabel: 'लॉगिन', icon: 'login' },
    { path: '/register', label: 'Register', marathiLabel: 'नोंदणी', icon: 'person_add' },
  ];

  let bottomNavItems = [
    { path: '/', label: 'Home', marathiLabel: 'मुख्यपृष्ठ', icon: 'home' },
    { path: '/login', label: 'Login', marathiLabel: 'लॉगिन', icon: 'login' },
    { path: '/register', label: 'Register', marathiLabel: 'नोंदणी', icon: 'person_add' },
  ];

  if (user?.role === 'worker') {
    navItems = [
      { path: '/worker', label: 'Home', marathiLabel: 'मुख्य', icon: 'home' },
      { path: '/worker/jobs', label: 'Jobs', marathiLabel: 'कामे', icon: 'work' },
      { path: '/worker/projects', label: 'Projects', marathiLabel: 'प्रकल्प', icon: 'construction' },
      { path: '/worker/messages', label: 'Messages', marathiLabel: 'संदेश', icon: 'chat' },
      { path: '/worker/earnings', label: 'Earnings', marathiLabel: 'कमाई', icon: 'payments' },
    ];
    bottomNavItems = [
      { path: '/worker', label: 'Home', marathiLabel: 'मुख्य', icon: 'home' },
      { path: '/worker/jobs', label: 'Jobs', marathiLabel: 'कामे', icon: 'work' },
      { path: '/worker/projects', label: 'Projects', marathiLabel: 'प्रकल्प', icon: 'construction' },
      { path: '/worker/messages', label: 'Messages', marathiLabel: 'संदेश', icon: 'chat' },
      { path: '/worker/earnings', label: 'Earnings', marathiLabel: 'कमाई', icon: 'payments' },
      { path: '/worker/profile', label: 'Profile', marathiLabel: 'प्रोफ़ाइल', icon: 'person' },
    ];
  } else if (user?.role === 'employer') {
    navItems = [
      { path: '/employer', label: 'Home', marathiLabel: 'Home', icon: 'home' },
      { path: '/employer/jobs', label: 'Jobs', marathiLabel: 'Jobs', icon: 'work' },
      { path: '/employer/workers', label: 'Workers', marathiLabel: 'Workers', icon: 'group' },
      { path: '/employer/projects', label: 'Projects', marathiLabel: 'Projects', icon: 'construction' },
      { path: '/employer/messages', label: 'Messages', marathiLabel: 'Messages', icon: 'chat' },
      { path: '/employer/payments', label: 'Payments', marathiLabel: 'Payments', icon: 'payments' },
    ];
    bottomNavItems = [
      { path: '/employer', label: 'Home', marathiLabel: 'Home', icon: 'home' },
      { path: '/employer/jobs', label: 'Jobs', marathiLabel: 'Jobs', icon: 'work' },
      { path: '/employer/workers', label: 'Workers', marathiLabel: 'Workers', icon: 'group' },
      { path: '/employer/projects', label: 'Projects', marathiLabel: 'Projects', icon: 'construction' },
      { path: '/employer/messages', label: 'Messages', marathiLabel: 'Messages', icon: 'chat' },
      { path: '/employer/profile', label: 'Profile', marathiLabel: 'Profile', icon: 'person' },
    ];
  } else if (user?.role === 'admin') {
    navItems = [
      { path: '/admin/dashboard', altPaths: ['/admin'], label: 'Dashboard', marathiLabel: 'Dashboard', icon: 'dashboard' },
      { path: '/admin/users', label: 'Users', marathiLabel: 'Users', icon: 'group' },
      { path: '/admin/projects', label: 'Projects', marathiLabel: 'Projects', icon: 'construction' },
      { path: '/admin/complaints', label: 'Complaints', marathiLabel: 'Complaints', icon: 'report_problem' },
      { path: '/admin/analytics', label: 'Analytics', marathiLabel: 'Analytics', icon: 'monitoring' },
      { path: '/admin/settings', label: 'Settings', marathiLabel: 'Settings', icon: 'settings' },
    ];
    bottomNavItems = [
      { path: '/admin/dashboard', altPaths: ['/admin'], label: 'Dashboard', marathiLabel: 'Dashboard', icon: 'dashboard' },
      { path: '/admin/users', label: 'Users', marathiLabel: 'Users', icon: 'group' },
      { path: '/admin/complaints', label: 'Complaints', marathiLabel: 'Complaints', icon: 'report_problem' },
      { path: '/admin/settings', label: 'Settings', marathiLabel: 'Settings', icon: 'settings' },
    ];
  }

  // Secondary links for dropdown menu & drawer
  const getSecondaryLinks = () => {
    if (user?.role === 'worker') {
      return [
        { path: '/worker/profile', label: 'My Profile & Skills', LucideIcon: User },
        { path: '/worker/applications', label: 'My Applications', LucideIcon: FileText },
        { path: '/worker/invitations', label: 'Job Invitations', LucideIcon: Mail },
        { path: '/worker/hiring', label: 'Agreements', LucideIcon: Handshake },
        { path: '/worker/notifications', label: 'Alerts & Updates', LucideIcon: Bell },
        { path: '/worker/complaints', label: 'Help & Complaints', LucideIcon: HelpCircle },
        { path: '/worker/disputes', label: 'Dispute Cases', LucideIcon: AlertTriangle },
      ];
    } else if (user?.role === 'employer') {
      return [
        { path: '/employer/profile', label: 'Company Profile & Info', LucideIcon: User },
        { path: '/employer/workers', label: 'Find Workers (AI)', LucideIcon: User },
        { path: '/employer/workers/map', label: 'Workers Map', LucideIcon: MapPin },
        { path: '/employer/jobs/create', label: 'Post New Job', LucideIcon: PlusCircle },
        { path: '/employer/invitations', label: 'Invitations Sent', LucideIcon: Mail },
        { path: '/employer/hiring', label: 'Agreements', LucideIcon: Handshake },
        { path: '/employer/notifications', label: 'Alerts & Updates', LucideIcon: Bell },
        { path: '/employer/complaints', label: 'Complaints', LucideIcon: HelpCircle },
        { path: '/employer/disputes', label: 'Disputes', LucideIcon: AlertTriangle },
      ];
    } else if (user?.role === 'admin') {
      return [
        { path: '/admin/settings', label: 'Admin Settings', LucideIcon: User },
        { path: '/admin/fraud-risk', label: 'Fraud & Risk Assessment', LucideIcon: Shield },
        { path: '/admin/verifications', label: 'ID Verifications', LucideIcon: FileText },
        { path: '/admin/audit-logs', label: 'System Audit Logs', LucideIcon: Layers },
      ];
    }
    return [];
  };

  const secondaryLinks = getSecondaryLinks();

  const getPortalLabel = () => {
    if (!user) return 'Connecting Workers & Employers';
    if (user.role === 'worker') return 'Worker Portal';
    if (user.role === 'employer') return 'Employer Portal';
    return 'Admin Portal';
  };

  const getRoleBadgeClasses = (role) => {
    if (role === 'worker') return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60';
    if (role === 'employer') return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
    return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const userAvatarUrl =
    !avatarError &&
    (user?.profilePicture || user?.avatar || user?.avatarUrl || user?.image)
      ? user?.profilePicture || user?.avatar || user?.avatarUrl || user?.image
      : null;

  return (
    <>
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 pt-safe bg-surface/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-surface-container-high/60 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-colors">
        <div className="h-20 sm:h-22 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 xl:gap-6 max-w-[1536px] mx-auto">
          {/* Logo & Platform Name */}
          <Link
            to={user ? `/${user.role}` : '/'}
            className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 min-w-max group"
            title="KaamSetu AI Home"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface-lowest dark:bg-slate-800 border border-outline-variant/50 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-all p-1">
              <KaamSetuLogo size={28} animated={true} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg md:text-xl font-black text-primary dark:text-sky-400 tracking-tight whitespace-nowrap">
                  KaamSetu AI
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden 2xl:inline">
                  (कामसेतू)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[10px] sm:text-xs text-secondary dark:text-slate-300 font-bold truncate">
                  {getPortalLabel()}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Animated Glassmorphism Spring Glide Menu (visible on lg screens with generous spacing) */}
          <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 px-1 xl:px-3">
            <GlassSpringNav
              items={navItems}
              variant="glass-light"
              size="adaptive"
              selectedLang={selectedLang}
              ariaLabel="Primary navigation"
            />
          </div>

          {/* Right Header Controls (Cleanly spaced, non-colliding across all widths) */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 flex-shrink-0 min-w-max z-10">
            {/* Language Switcher Pill (Desktop xl+) */}
            <div className="hidden xl:inline-flex items-center bg-surface-container dark:bg-slate-800 rounded-full p-1 shadow-xs border border-outline-variant/30 dark:border-slate-700/80 flex-shrink-0 gap-0.5">
              {['EN', 'म', 'हि'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2.5 py-1 rounded-full font-label-sm text-xs font-semibold transition-all cursor-pointer ${
                    selectedLang === lang
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Notification Bell (Authenticated Users) */}
            {user && (
              <Link
                to={`/${user.role}/notifications`}
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container dark:hover:bg-slate-800 transition-colors flex-shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
                aria-label="View notifications"
              >
                <Bell className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-surface animate-ping" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                  </>
                )}
              </Link>
            )}

            {/* Theme Switcher Sun/Moon Toggle Button */}
            <div className="flex-shrink-0">
              <ThemeToggleButton size="md" />
            </div>

            {/* Authenticated User Profile Button & Glass Menu (Visible across ALL devices) */}
            {user ? (
              <div className="relative flex-shrink-0 block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="group inline-flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 sm:pr-2.5 lg:pr-3 rounded-full transition-all duration-300 border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 shadow-xs hover:shadow-sm backdrop-blur-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  title="User profile & navigation menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-sky-500 dark:to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs group-hover:scale-105 transition-transform flex-shrink-0 overflow-hidden ring-1 ring-white/60 dark:ring-slate-700">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <div className="hidden md:flex flex-col text-left min-w-0">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 max-w-[100px] lg:max-w-[130px] truncate leading-tight">
                      {user.name ? user.name.split(' ')[0] : 'User'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold capitalize leading-tight">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown
                    className={`hidden sm:block w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${
                      showUserMenu ? 'rotate-180 text-primary dark:text-sky-400' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu with Liquid Glassmorphism Card */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 sm:mt-3 w-76 sm:w-80 md:w-84 max-w-[calc(100vw-1.5rem)] rounded-2xl p-3 sm:p-3.5 shadow-2xl z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-700/80 transition-all duration-200 ease-out transform origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-2 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
                  >
                    {/* User Profile Header in Dropdown (Clickable to full profile) */}
                    <Link
                      to={`/${user.role}/profile`}
                      onClick={() => setShowUserMenu(false)}
                      className="block p-3 sm:p-3.5 mb-2 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/90 dark:to-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 shadow-inner hover:border-primary/50 dark:hover:border-sky-500/50 transition-colors group cursor-pointer"
                      title="View full profile"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-sky-500 dark:to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm flex-shrink-0 ring-2 ring-white dark:ring-slate-700 overflow-hidden">
                          {userAvatarUrl ? (
                            <img
                              src={userAvatarUrl}
                              alt={user.name || 'User'}
                              className="w-full h-full object-cover"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <span>{userInitial}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                            {user.name}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">
                            {user.email || user.phone}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadgeClasses(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                            <span className="text-[11px] font-bold text-primary dark:text-sky-400 group-hover:underline">
                              View Profile →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Secondary Navigation Links */}
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {secondaryLinks.map((link) => {
                        const Icon = link.LucideIcon;
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-sky-400 transition-colors"
                          >
                            <Icon className="w-4.5 h-4.5 text-primary dark:text-sky-400 flex-shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Language Selector inside Dropdown */}
                    <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Language</span>
                      <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/80 dark:border-slate-700">
                        {['EN', 'म', 'हि'].map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setSelectedLang(l)}
                            className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                              selectedLang === l
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors mt-1 border-t border-slate-200 dark:border-slate-800/80 cursor-pointer"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Mobile / Tablet Hamburger Menu Trigger Button (< lg) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Slide-In Responsive Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[1050] flex justify-end animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content panel */}
          <div
            ref={drawerRef}
            className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto p-5 z-10 transition-transform duration-300 ease-out animate-in slide-in-from-right"
          >
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-surface-lowest dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1">
                    <KaamSetuLogo size={26} animated={false} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-primary dark:text-sky-400">KaamSetu AI</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{getPortalLabel()}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Summary (if authenticated) */}
              {user ? (
                <Link
                  to={`/${user.role}/profile`}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-800/90 dark:to-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3 hover:border-primary/50 transition-colors group cursor-pointer"
                  title="View profile"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-sky-500 dark:to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm flex-shrink-0 overflow-hidden ring-1 ring-white dark:ring-slate-700">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                      {user.name}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs truncate">
                      {user.email || user.phone}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getRoleBadgeClasses(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                      <span className="text-[10px] font-bold text-primary dark:text-sky-400 group-hover:underline">
                        Profile →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Welcome to KaamSetu AI. Sign in to access your dashboard.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to="/login"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex-1 py-2 rounded-xl text-center text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex-1 py-2 rounded-xl text-center text-xs font-bold bg-primary hover:bg-primary-hover text-white transition-colors shadow-xs"
                    >
                      Register
                    </Link>
                  </div>
                </div>
              )}

              {/* Language Switcher Selector in Drawer */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Language / भाषा
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'EN', label: 'English' },
                    { code: 'म', label: 'मराठी' },
                    { code: 'हि', label: 'हिंदी' },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedLang(code)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedLang === code
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Navigation Links */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Main Navigation
                </label>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.altPaths && item.altPaths.includes(location.pathname)) ||
                      (item.path !== '/' &&
                        item.path !== '/worker' &&
                        item.path !== '/employer' &&
                        item.path !== '/admin' &&
                        location.pathname.startsWith(item.path));

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        <span>{selectedLang === 'म' ? item.marathiLabel || item.label : item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Secondary Navigation Links */}
              {secondaryLinks.length > 0 && (
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Quick Actions
                  </label>
                  <div className="space-y-1">
                    {secondaryLinks.map((link) => {
                      const Icon = link.LucideIcon;
                      const isActive = location.pathname === link.path;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary dark:text-sky-400 font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-sky-400'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-primary dark:text-sky-400 flex-shrink-0" />
                          <span className="truncate">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Theme Toggle row */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {isDark ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
                </span>
                <ThemeToggleButton size="sm" />
              </div>

              {/* Logout button if authenticated */}
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Glassmorphism Spring Glide Menu Bar (shown on screens < lg) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 flex justify-center pointer-events-none pb-safe">
        <div className="pointer-events-auto w-full max-w-md">
          <GlassSpringNav
            items={bottomNavItems}
            variant="glass-mobile"
            selectedLang={selectedLang}
            size="sm"
            ariaLabel="Mobile primary navigation"
          />
        </div>
      </div>
    </>
  );
};

export default Navbar;
