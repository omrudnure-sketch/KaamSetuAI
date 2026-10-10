import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const WorkerPage = () => {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-space-md py-2">
      {/* Active Project Context Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary text-on-primary p-space-md shadow-md">
        <div className="flex items-start justify-between gap-space-sm relative z-10">
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-space-xs mb-1">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
              <span className="font-label-sm text-xs tracking-wider uppercase text-primary-fixed">
                Active Site • कामगार पोर्टल
              </span>
            </div>
            <h2 className="font-headline-sm text-lg sm:text-xl font-bold tracking-tight truncate text-surface-lowest">
              Welcome back, {user?.name || 'Worker'}!
            </h2>
            <div className="flex items-center gap-space-sm mt-1 text-primary-fixed font-body-sm text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">badge</span> Verified Worker
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">location_on</span> Available for Hire
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-lowest/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-on-primary">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              construction
            </span>
          </div>
        </div>
        <div className="mt-space-md pt-space-xs flex items-center justify-between text-primary-fixed font-label-sm text-xs relative z-10 border-t border-primary-fixed/20">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified_user</span> Escrow Protection
          </span>
          <span className="bg-primary-container px-2.5 py-1 rounded-full text-surface-lowest font-bold text-[11px]">
            Ready for Work
          </span>
        </div>
      </div>

      {/* Main Action Bento Cards */}
      <div className="grid grid-cols-2 gap-space-sm">
        {/* Card 1: Find Jobs */}
        <Link
          to="/worker/jobs"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">search</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Find Jobs</div>
            <div className="font-label-sm text-xs text-on-surface-variant">कामे शोधा</div>
          </div>
        </Link>

        {/* Card 2: My Projects */}
        <Link
          to="/worker/projects"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">construction</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">My Projects</div>
            <div className="font-label-sm text-xs text-on-surface-variant">माझे प्रकल्प & हजेरी</div>
          </div>
        </Link>

        {/* Card 3: Earnings */}
        <Link
          to="/worker/earnings"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-secondary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Earnings</div>
            <div className="font-label-sm text-xs text-on-surface-variant">कमाई & व्यवहार</div>
          </div>
        </Link>

        {/* Card 4: Messages */}
        <Link
          to="/worker/messages"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">chat</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Chat</div>
            <div className="font-label-sm text-xs text-on-surface-variant">संदेश</div>
          </div>
        </Link>
      </div>

      {/* Additional Quick Links */}
      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 space-y-2">
        <div className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">
          Quick Actions • त्वरित पर्याय
        </div>
        <div className="grid grid-cols-3 gap-space-xs text-center">
          <Link
            to="/worker/applications"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-primary mb-1">assignment</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Applications</span>
          </Link>
          <Link
            to="/worker/invitations"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary mb-1">mail</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Invitations</span>
          </Link>
          <Link
            to="/worker/complaints"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-error mb-1">help_outline</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Help / Issue</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

