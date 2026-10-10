import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/ai-assistant', label: 'AI Assistant', icon: 'smart_toy' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'monitoring' },
    { path: '/admin/fraud-risk', label: 'Risk & Fraud', icon: 'security' },
    { path: '/admin/users', label: 'Users', icon: 'group' },
    { path: '/admin/verifications', label: 'Verification', icon: 'verified_user' },
    { path: '/admin/projects', label: 'Projects', icon: 'construction' },
    { path: '/admin/complaints', label: 'Complaints', icon: 'report_problem' },
    { path: '/admin/disputes', label: 'Disputes', icon: 'gavel' },
    { path: '/admin/reports', label: 'Reports', icon: 'download' },
    { path: '/admin/map', label: 'Geo Analytics', icon: 'map' },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'receipt_long' },
  ];

  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      {/* Sidebar */}
      <aside
        className={`bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-surface-container-high">
          {!collapsed && (
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">shield</span>
              <span className="font-headline-sm font-bold text-sm text-primary tracking-tight">
                KaamSetu Admin
              </span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'menu_open' : 'menu'}
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
                title={item.label}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info / Logout */}
        <div className="p-3 border-t border-surface-container-high flex items-center justify-between">
          {!collapsed && (
            <div className="min-w-0 pr-2">
              <div className="font-label-md text-xs font-bold truncate text-on-surface">
                {user?.name || 'Administrator'}
              </div>
              <div className="font-body-sm text-[10px] text-on-surface-variant uppercase font-bold">
                {user?.adminRole || 'Super Admin'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-error hover:bg-error-container/30 transition-colors"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-6 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between">
          <div className="font-label-md text-xs font-bold text-on-surface-variant">
            Platform Command & Governance Center
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
              English Only
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
