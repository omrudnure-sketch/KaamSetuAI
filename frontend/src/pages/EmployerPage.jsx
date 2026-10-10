import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const EmployerPage = () => {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-space-md py-2">
      {/* Employer Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary text-on-primary p-space-md shadow-md">
        <div className="flex items-start justify-between gap-space-sm relative z-10">
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-space-xs mb-1">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
              <span className="font-label-sm text-xs tracking-wider uppercase text-primary-fixed">
                Employer Dashboard • मालक पोर्टल
              </span>
            </div>
            <h2 className="font-headline-sm text-lg sm:text-xl font-bold tracking-tight truncate text-surface-lowest">
              Welcome back, {user?.name || 'Employer'}!
            </h2>
            <div className="flex items-center gap-space-sm mt-1 text-primary-fixed font-body-sm text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span> Verified Business
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">work_history</span> Active Hiring
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-lowest/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-on-primary">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              business_center
            </span>
          </div>
        </div>
        <div className="mt-space-md pt-space-xs flex items-center justify-between text-primary-fixed font-label-sm text-xs relative z-10 border-t border-primary-fixed/20">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">shield</span> Escrow Secured Payments
          </span>
          <Link
            to="/employer/jobs/create"
            className="bg-secondary-container text-on-secondary-container font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px]">add</span> Post Job
          </Link>
        </div>
      </div>

      {/* Bento Grid Actions */}
      <div className="grid grid-cols-2 gap-space-sm">
        <Link
          to="/employer/jobs"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">work</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Posted Jobs</div>
            <div className="font-label-sm text-xs text-on-surface-variant">कामांच्या जाहिराती</div>
          </div>
        </Link>

        <Link
          to="/employer/projects"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">construction</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Projects</div>
            <div className="font-label-sm text-xs text-on-surface-variant">सुरू असलेले प्रकल्प</div>
          </div>
        </Link>

        <Link
          to="/employer/payments"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-secondary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Payments</div>
            <div className="font-label-sm text-xs text-on-surface-variant">पैसे देयके & खातेवही</div>
          </div>
        </Link>

        <Link
          to="/employer/messages"
          className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">chat</span>
          </div>
          <div className="mt-3">
            <div className="font-label-md text-sm font-bold text-on-surface">Messages</div>
            <div className="font-label-sm text-xs text-on-surface-variant">कामगारांशी संवाद</div>
          </div>
        </Link>
      </div>

      {/* Quick Links Strip */}
      <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-outline-variant/30 space-y-2">
        <div className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">
          Management • व्यवस्थापन
        </div>
        <div className="grid grid-cols-3 gap-space-xs text-center">
          <Link
            to="/employer/invitations"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-primary mb-1">mail</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Invitations</span>
          </Link>
          <Link
            to="/employer/hiring"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary-container mb-1">handshake</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Agreements</span>
          </Link>
          <Link
            to="/employer/disputes"
            className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col items-center"
          >
            <span className="material-symbols-outlined text-[20px] text-error mb-1">gavel</span>
            <span className="font-label-sm text-[11px] font-semibold text-on-surface">Disputes</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

