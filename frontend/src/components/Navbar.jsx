import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [selectedLang, setSelectedLang] = useState('EN');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define mobile bottom bar tabs based on role
  let bottomNavItems = [
    { path: '/', label: 'Home', marathiLabel: 'मुख्यपृष्ठ', icon: 'home' },
    { path: '/login', label: 'Login', marathiLabel: 'लॉगिन', icon: 'login' },
    { path: '/register', label: 'Register', marathiLabel: 'नोंदणी', icon: 'person_add' },
  ];

  if (user?.role === 'worker') {
    bottomNavItems = [
      { path: '/worker', label: 'Home', marathiLabel: 'मुख्य', icon: 'home' },
      { path: '/worker/jobs', label: 'Jobs', marathiLabel: 'कामे', icon: 'work' },
      { path: '/worker/projects', label: 'Projects', marathiLabel: 'प्रकल्प', icon: 'construction' },
      { path: '/worker/messages', label: 'Messages', marathiLabel: 'संदेश', icon: 'chat' },
      { path: '/worker/earnings', label: 'Earnings', marathiLabel: 'कमाई', icon: 'payments' },
      { path: '/worker/profile', label: 'Profile', marathiLabel: 'प्रोफ़ाइल', icon: 'person' },
    ];
  } else if (user?.role === 'employer') {
    bottomNavItems = [
      { path: '/employer', label: 'Home', marathiLabel: 'Home', icon: 'home' },
      { path: '/employer/jobs', label: 'Jobs', marathiLabel: 'Jobs', icon: 'work' },
      { path: '/employer/projects', label: 'Projects', marathiLabel: 'Projects', icon: 'construction' },
      { path: '/employer/messages', label: 'Messages', marathiLabel: 'Messages', icon: 'chat' },
      { path: '/employer/payments', label: 'Payments', marathiLabel: 'Payments', icon: 'payments' },
      { path: '/employer/profile', label: 'Profile', marathiLabel: 'Profile', icon: 'person' },
    ];
  } else if (user?.role === 'admin') {
    bottomNavItems = [
      { path: '/admin', label: 'Dashboard', marathiLabel: 'Dashboard', icon: 'dashboard' },
      { path: '/', label: 'Home', marathiLabel: 'Home', icon: 'home' },
    ];
  }

  // Quick navigation items for top drawer/desktop menu
  const getSecondaryLinks = () => {
    if (user?.role === 'worker') {
      return [
        { path: '/worker/applications', label: 'Applications', icon: 'assignment' },
        { path: '/worker/invitations', label: 'Invitations', icon: 'mail' },
        { path: '/worker/hiring', label: 'Agreements', icon: 'handshake' },
        { path: '/worker/notifications', label: 'Alerts', icon: 'notifications' },
        { path: '/worker/complaints', label: 'Help & Support', icon: 'help_outline' },
        { path: '/worker/disputes', label: 'Disputes', icon: 'gavel' },
      ];
    } else if (user?.role === 'employer') {
      return [
        { path: '/employer/workers', label: 'Find Workers (AI)', icon: 'search' },
        { path: '/employer/workers/map', label: 'Workers Map', icon: 'map' },
        { path: '/employer/jobs/new', label: 'Post New Job', icon: 'add_circle' },
        { path: '/employer/invitations', label: 'Invitations', icon: 'mail' },
        { path: '/employer/hiring', label: 'Agreements', icon: 'handshake' },
        { path: '/employer/notifications', label: 'Alerts', icon: 'notifications' },
        { path: '/employer/complaints', label: 'Complaints', icon: 'report_problem' },
        { path: '/employer/disputes', label: 'Disputes', icon: 'gavel' },
      ];
    }
    return [];
  };

  const secondaryLinks = getSecondaryLinks();

  return (
    <>
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 md:h-20 px-4 md:px-6 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Logo & Title */}
          <Link to={user ? `/${user.role}` : '/'} className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-on-primary text-[24px]">construction</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight truncate">
                  KaamSetu AI
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium hidden sm:inline">
                  (कामसेतू)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tertiary-container animate-pulse' : 'bg-outline-variant'}`} />
                <span className="font-label-sm text-label-sm text-secondary font-bold truncate">
                  {user ? (user.role === 'worker' ? 'Worker Portal' : 'Employer Portal') : 'Connecting Workers & Employers'}
                </span>
              </div>
            </div>
          </Link>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language Switcher Pill */}
            <div className="inline-flex items-center bg-surface-container rounded-full p-1 shadow-xs border border-outline-variant/30">
              {['EN', 'म', 'हि'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2 py-0.5 rounded-full font-label-sm text-xs transition-all ${
                    selectedLang === lang
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Notification Alert Button */}
            {user && (
              <Link
                to={`/${user.role}/notifications`}
                className="relative w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-secondary-container ring-2 ring-surface animate-ping" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-secondary-container" />
              </Link>
            )}

            {/* User Profile / Menu Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-surface-container transition-colors border border-outline-variant/40"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant hidden md:inline">
                    arrow_drop_down
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-container-lowest p-2 shadow-xl border border-outline-variant/40 z-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="p-3 border-b border-surface-container-high mb-1">
                      <div className="font-label-md text-on-surface font-bold truncate">{user.name}</div>
                      <div className="font-body-sm text-on-surface-variant truncate">{user.email || user.phone}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase">
                        {user.role}
                      </span>
                    </div>

                    {secondaryLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">{link.icon}</span>
                        <span>{link.label}</span>
                      </Link>
                    ))}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-container/30 transition-colors mt-1 border-t border-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-full font-label-md text-xs text-primary font-bold hover:bg-surface-container transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-full font-label-md text-xs bg-primary text-on-primary font-bold shadow-sm hover:bg-primary-container transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-surface-container-high/60 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {bottomNavItems.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 min-w-[48px] h-12 flex flex-col items-center justify-center transition-all rounded-xl ${
                  isActive
                    ? 'text-primary font-bold scale-105'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'font-bold' : ''}`}>
                  {tab.icon}
                </span>
                <span className="font-label-sm text-[10px] tracking-tight truncate mt-0.5">
                  {selectedLang === 'EN' ? tab.label : tab.marathiLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

