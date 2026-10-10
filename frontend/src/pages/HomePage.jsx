import React from 'react';
import { Link } from 'react-router-dom';
import { useHealthCheck } from '../hooks/index.js';
import { useAuth } from '../context/AuthContext.jsx';

export const HomePage = () => {
  const { data, isLoading, isError } = useHealthCheck();
  const { user } = useAuth();

  return (
    <div className="w-full space-y-space-md py-4">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-primary text-on-primary p-space-md sm:p-space-lg shadow-md">
        <div className="flex items-start justify-between gap-space-sm relative z-10">
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-space-xs mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse" />
              <span className="font-label-sm text-xs tracking-wider uppercase text-primary-fixed font-bold">
                Smart Worker & Employer Platform • कामसेतू AI
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-surface-lowest font-extrabold tracking-tight">
              Connect. Work. Earn Securely.
            </h1>
            <p className="font-body-md text-sm sm:text-base text-primary-fixed mt-1 max-w-lg">
              Empowering blue-collar workers and employers with instant job matching, verified daily attendance, chat & real-time updates.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-surface-lowest/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              engineering
            </span>
          </div>
        </div>

        {/* Backend Status Strip inside Hero */}
        <div className="mt-space-md pt-space-xs border-t border-primary-fixed/20 flex items-center justify-between text-primary-fixed font-label-sm text-xs relative z-10">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified_user</span> Escrow & Contracts Protected
          </span>
          <div className="flex items-center gap-2">
            {isLoading && <span className="text-secondary-container animate-pulse">Connecting API...</span>}
            {isError && <span className="text-error bg-error-container/80 px-2 py-0.5 rounded text-[11px]">API Offline</span>}
            {data?.success && (
              <span className="bg-tertiary-container px-2.5 py-1 rounded-full text-on-tertiary-container font-bold flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[13px]">check_circle</span> Live Server Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Portal Selection Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        {/* Worker Portal Card */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4 border border-outline-variant/30">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">engineering</span>
            </div>
            <div>
              <div className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                For Workers • कामगारांसाठी
              </div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface mt-0.5">
                Worker Portal
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                Find local daily jobs, accept invitations, punch daily attendance, upload work progress, track earnings and chat with employers in Marathi, Hindi or English.
              </p>
            </div>
          </div>
          <Link
            to="/worker"
            className="w-full h-12 rounded-xl bg-tertiary text-on-tertiary font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-tertiary-container transition-all active:scale-[0.99]"
          >
            <span>Enter Worker Portal • कामगार पोर्टल</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Employer Portal Card */}
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4 border border-outline-variant/30">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">business_center</span>
            </div>
            <div>
              <div className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                For Employers • मालकांसाठी
              </div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface mt-0.5">
                Employer Portal
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                Post jobs, hire verified workers, manage multi-day projects, monitor real-time daily progress, record milestone payments, and resolve site disputes.
              </p>
            </div>
          </div>
          <Link
            to="/employer"
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container transition-all active:scale-[0.99]"
          >
            <span>Enter Employer Portal • मालक पोर्टल</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Feature Highlights Quick Strip */}
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-outline-variant/30 space-y-3">
        <div className="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Platform Features • वैशिष्ट्ये
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm text-center">
          <div className="p-3 rounded-lg bg-surface-container-lowest flex flex-col items-center">
            <span className="material-symbols-outlined text-[24px] text-primary mb-1">badge</span>
            <span className="font-label-sm text-xs font-bold text-on-surface">Verified Profiles</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest flex flex-col items-center">
            <span className="material-symbols-outlined text-[24px] text-tertiary-container mb-1">event_available</span>
            <span className="font-label-sm text-xs font-bold text-on-surface">Daily Attendance</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest flex flex-col items-center">
            <span className="material-symbols-outlined text-[24px] text-secondary mb-1">chat</span>
            <span className="font-label-sm text-xs font-bold text-on-surface">Real-Time Chat</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest flex flex-col items-center">
            <span className="material-symbols-outlined text-[24px] text-error mb-1">gavel</span>
            <span className="font-label-sm text-xs font-bold text-on-surface">Dispute System</span>
          </div>
        </div>
      </div>
    </div>
  );
};

