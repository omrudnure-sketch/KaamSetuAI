import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const userRoleRedirect = `/${user.role}`;
    const requiredRoleLabel = allowedRoles.includes('worker')
      ? 'workers only'
      : allowedRoles.includes('employer')
      ? 'employers only'
      : 'administrators only';

    const currentUserLabel =
      user.role === 'worker' ? 'Worker' : user.role === 'employer' ? 'Employer' : 'Administrator';

    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            This page is available to {requiredRoleLabel}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You are signed in as a <strong className="text-slate-800 dark:text-slate-200">{currentUserLabel}</strong>. You do not have permission to view this section.
          </p>
          <div className="pt-2">
            <Link
              to={userRoleRedirect}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Go to {currentUserLabel} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
