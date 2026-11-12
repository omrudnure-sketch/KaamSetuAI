import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { KaamSetuLogo } from '../components/KaamSetuLogo.jsx';
import { GlassSpringNav } from '../components/GlassSpringNav.jsx';
import { ThemeToggleButton } from '../components/ThemeToggleButton.jsx';
import { SmartBackBar, FloatingBackButton } from '../components/index.js';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
  Gavel,
  BarChart3,
  ShieldAlert,
  MapPin,
  FileText,
  Download,
  Settings,
  HelpCircle,
  Sparkles,
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const profileMenuRef = useRef(null);

  // Close mobile menu on internal route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener for admin profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Escape key handler for admin dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navMenuItems = [
    {
      path: '/admin/dashboard',
      altPaths: ['/admin'],
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/admin/users',
      label: 'Users & Workers',
      icon: Users,
    },
    {
      path: '/admin/verifications',
      label: 'Verification Queue',
      icon: ShieldCheck,
    },
    {
      path: '/admin/projects',
      label: 'Projects & Contracts',
      icon: Briefcase,
    },
    {
      path: '/admin/complaints',
      label: 'Complaints',
      icon: AlertTriangle,
    },
    {
      path: '/admin/disputes',
      label: 'Dispute Resolution',
      icon: Gavel,
    },
    {
      path: '/admin/analytics',
      label: 'Platform Analytics',
      icon: BarChart3,
    },
    {
      path: '/admin/fraud-risk',
      label: 'Risk & Fraud Flags',
      icon: ShieldAlert,
    },
    {
      path: '/admin/map',
      label: 'Geo Supply & Gaps',
      icon: MapPin,
    },
    {
      path: '/admin/audit-logs',
      label: 'System Audit Logs',
      icon: FileText,
    },
    {
      path: '/admin/reports',
      label: 'Export Reports',
      icon: Download,
    },
  ];

  const secondaryNavItems = [
    {
      path: '/admin/ai-assistant',
      label: 'AI Copilot Assistant',
      icon: Sparkles,
      badge: 'AI',
    },
    {
      path: '/admin/settings',
      label: 'Admin Settings',
      icon: Settings,
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-2 sm:p-4 md:p-6 lg:p-7 flex items-center justify-center font-sans antialiased transition-colors">
      {/* Centered Rounded Workspace Card matching the reference design */}
      <div className="w-full max-w-[1560px] bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] md:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.07),0_0_1px_rgba(15,23,42,0.15)] border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col lg:flex-row min-h-[92vh]">
        
        {/* ==============================================================
            LEFT SIDEBAR
            ============================================================== */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`lg:w-64 xl:w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between p-5 transition-all duration-300 z-50 ${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl overflow-y-auto' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-6">
            {/* Top Brand Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100/80">
              <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center p-1 group-hover:scale-105 transition-transform shadow-2xs">
                  <KaamSetuLogo size={26} animated={false} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                      KaamSetu AI
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase tracking-wider border border-indigo-200/60">
                      Admin
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium tracking-tight">
                    Governance & Operations
                  </span>
                </div>
              </Link>

              {/* Mobile Close Button */}
              {mobileMenuOpen && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Main Menu Links with Spring Glide Indicator */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-600 tracking-wider uppercase px-3 mb-2">
                Menu
              </div>
              <GlassSpringNav
                items={navMenuItems}
                orientation="vertical"
                variant="glass-sidebar"
                showChevron={true}
                size="sm"
                ariaLabel="Admin main navigation"
              />
            </div>

            {/* System / Secondary Section */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-600 tracking-wider uppercase px-3 mb-1.5">
                System
              </div>
              <GlassSpringNav
                items={secondaryNavItems}
                orientation="vertical"
                variant="glass-sidebar"
                size="sm"
                ariaLabel="Admin system navigation"
              />
            </div>
          </div>

          {/* Bottom Card: Inspired by the gradient promotional card in the reference screenshot */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            <div className="relative rounded-2xl p-4 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white shadow-md overflow-hidden group">
              {/* Subtle ambient lighting inside card */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-cyan-400/20 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              
              <div className="relative z-10 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight text-white">
                    KaamSetu Copilot
                  </h4>
                  <p className="text-[11px] text-slate-300/90 leading-relaxed mt-0.5">
                    Query governance analytics & detect project delays in real-time.
                  </p>
                </div>
                <Link
                  to="/admin/ai-assistant"
                  className="inline-block w-full text-center py-1.5 px-3 rounded-xl bg-white text-slate-900 text-[11px] font-extrabold shadow-xs hover:bg-slate-100 active:scale-95 transition-all"
                >
                  Explore AI Insights
                </Link>
              </div>
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ==============================================================
            MAIN CONTENT AREA
            ============================================================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 transition-colors">
          
          {/* Top Bar Header (Matching reference: Search on left, Chat/Bell/Admin Profile on right) */}
          <header className="px-4 sm:px-7 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900">
            
            {/* Mobile Menu Toggle & Search Bar */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Toggle admin sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search workers, jobs, disputes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-700 focus:border-primary text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                />
              </form>
            </div>

            {/* Desktop Spring Glide Glassmorphic Quick Navigation Tabs */}
            <div className="hidden xl:flex items-center">
              <GlassSpringNav
                items={[
                  { path: '/admin/dashboard', altPaths: ['/admin'], label: 'Dashboard', icon: LayoutDashboard },
                  { path: '/admin/users', label: 'Users', icon: Users },
                  { path: '/admin/projects', label: 'Projects', icon: Briefcase },
                  { path: '/admin/complaints', label: 'Complaints', icon: AlertTriangle },
                  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
                  { path: '/admin/settings', label: 'Settings', icon: Settings },
                ]}
                variant="glass-light"
                size="sm"
                ariaLabel="Admin quick tabs"
              />
            </div>

            {/* Right Action Icons & Admin Profile Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              {/* Theme Switcher Toggle */}
              <ThemeToggleButton size="md" />

              {/* Quick AI Mode Button */}
              <Link
                to="/admin/ai-assistant"
                title="AI Copilot Assistant"
                className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-sky-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-2xs"
              >
                <MessageSquare className="w-4 h-4" />
              </Link>

              {/* Notification Bell */}
              <Link
                to="/admin/complaints"
                title="Pending Governance Alerts"
                className="relative w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-sky-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-2xs"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </Link>

              {/* Admin Profile Pill */}
              <div className="relative flex-shrink-0" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-2.5 p-1 sm:pr-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                  title="Admin profile menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-900 to-primary text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-white dark:ring-slate-800 overflow-hidden flex-shrink-0">
                    {!avatarError && (user?.profilePicture || user?.avatar || user?.avatarUrl || user?.image) ? (
                      <img
                        src={user?.profilePicture || user?.avatar || user?.avatarUrl || user?.image}
                        alt={user?.name || 'Admin'}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}</span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                        {user?.name || 'Administrator'}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          profileDropdownOpen ? 'rotate-180 text-primary dark:text-sky-400' : ''
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {user?.email || 'admin@kaamsetu.ai'}
                    </span>
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-2 z-[1000] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Administrator'}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'admin@kaamsetu.ai'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800/60">
                        {user?.adminRole || 'Super Admin'}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/admin/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/admin/audit-logs"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Audit Activity</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Viewport Area */}
          <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto">
            {/* Universal Animated Back Navigation Bar */}
            <SmartBackBar />
            <Outlet />
          </main>
        </div>
      </div>
      {/* Floating Quick-Back Button */}
      <FloatingBackButton />
    </div>
  );
};

export default AdminLayout;
