import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { WorkerAvailabilityControl } from '../components/WorkerAvailabilityControl.jsx';
import {
  Search,
  Briefcase,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  FileText,
  Mail,
  Handshake,
  HelpCircle,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export const WorkerPage = () => {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <div className="w-full space-y-6 py-2">
      {/* ==============================================================
          HERO BANNER: Liquid Glass Welcome & Daily Status
          ============================================================== */}
      <div className="relative overflow-hidden rounded-[26px] ks-glass-hero p-6 sm:p-8 text-white shadow-xl">
        {/* Soft Background Orbs */}
        <div className="absolute top-0 right-10 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-cyan-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>Worker Workspace • कामगार कक्ष</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-headline-lg">
              Welcome back, {user?.name ? user.name.split(' ')[0] : 'Worker'}!
            </h1>

            <p className="text-sm text-cyan-100/90 leading-relaxed font-medium">
              Discover verified daily jobs, manage active site agreements, record attendance, and receive transparent payments.
            </p>

            <div className="flex items-center gap-4 pt-2 text-xs text-blue-200 flex-wrap font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <ShieldCheck size={15} className="text-cyan-400" /> Verified Worker
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <CheckCircle2 size={15} className="text-emerald-400" /> Transparent Terms
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
            <Link
              to="/worker/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-400/25 transition-all hover:-translate-y-0.5 select-none"
            >
              <Search size={16} />
              <span>Find Work Today</span>
              <ArrowRight size={16} />
            </Link>
            <div className="text-[11px] text-cyan-200/80 font-medium">
              Location-aware matching active
            </div>
          </div>
        </div>

        {/* Bottom Status Ribbon */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between text-xs text-blue-100 gap-3 relative z-10">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Digital contracts backed by direct wage ledger</span>
          </span>
          <span
            className={`px-3 py-0.5 rounded-full font-bold text-xs ${
              isAvailable ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
            }`}
          >
            {isAvailable ? '● Ready for Work • उपलब्ध' : '○ Not Available • अनुपलब्ध'}
          </span>
        </div>
      </div>

      {/* ==============================================================
          WORKER AVAILABILITY STATUS CONTROLLER
          ============================================================== */}
      <div className="ks-glass-card p-4 sm:p-5">
        <WorkerAvailabilityControl
          lang={user?.preferredLanguage || 'en'}
          onStatusChange={(newStatus) => setIsAvailable(newStatus)}
        />
      </div>

      {/* ==============================================================
          MAIN 4 KPI BENTO CARDS
          ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Find Jobs */}
        <Link
          to="/worker/jobs"
          className="ks-glass-card ks-glass-card-hover p-5 flex flex-col justify-between group text-decoration-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-600 dark:text-cyan-300 group-hover:scale-110 transition-transform">
              <Search size={22} />
            </div>
            <span className="ks-badge-cyan text-[10px]">Nearby</span>
          </div>
          <div className="mt-5 space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              Find Jobs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Browse trade opportunities, filter by wage & distance.
            </p>
            <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 pt-1 flex items-center gap-1">
              <span>कामे शोधा</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: Active Projects */}
        <Link
          to="/worker/projects"
          className="ks-glass-card ks-glass-card-hover p-5 flex flex-col justify-between group text-decoration-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <Briefcase size={22} />
            </div>
            <span className="ks-badge-emerald text-[10px]">Sites</span>
          </div>
          <div className="mt-5 space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              My Projects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Punch daily attendance & log work completion proofs.
            </p>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1">
              <span>प्रकल्प & हजेरी</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 3: Earnings */}
        <Link
          to="/worker/earnings"
          className="ks-glass-card ks-glass-card-hover p-5 flex flex-col justify-between group text-decoration-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <DollarSign size={22} />
            </div>
            <span className="ks-badge-amber text-[10px]">Wages</span>
          </div>
          <div className="mt-5 space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
              Earnings & Pay
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Track earned wages, pending milestones & payout receipts.
            </p>
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 pt-1 flex items-center gap-1">
              <span>कमाई व हिशोब</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 4: Messages */}
        <Link
          to="/worker/messages"
          className="ks-glass-card ks-glass-card-hover p-5 flex flex-col justify-between group text-decoration-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-600 dark:text-purple-300 group-hover:scale-110 transition-transform">
              <MessageSquare size={22} />
            </div>
            <span className="ks-badge-purple text-[10px]">Chat</span>
          </div>
          <div className="mt-5 space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
              Direct Messages
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Chat with employers in Marathi, Hindi, or English.
            </p>
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 pt-1 flex items-center gap-1">
              <span>संदेश व भाषांतर</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* ==============================================================
          QUICK WORKER ACTION SUITE
          ============================================================== */}
      <div className="ks-glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Workspace Actions • त्वरित पर्याय
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hiring Pipeline & Support
            </h3>
          </div>
          <Link
            to="/worker/jobs/map"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            <MapPin size={14} />
            <span>Map View</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/worker/applications"
            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-cyan-400/50 hover:bg-white dark:hover:bg-white/[0.07] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Applications</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">माझे अर्ज</span>
          </Link>

          <Link
            to="/worker/invitations"
            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-amber-400/50 hover:bg-white dark:hover:bg-white/[0.07] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Mail size={20} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Invitations</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">निमंत्रणे</span>
          </Link>

          <Link
            to="/worker/hiring"
            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-emerald-400/50 hover:bg-white dark:hover:bg-white/[0.07] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Handshake size={20} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Agreements</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">करार</span>
          </Link>

          <Link
            to="/worker/complaints"
            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 hover:border-rose-400/50 hover:bg-white dark:hover:bg-white/[0.07] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HelpCircle size={20} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Help & Dispute</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">तक्रार / वाद</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WorkerPage;
