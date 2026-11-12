import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Briefcase,
  HardHat,
  CreditCard,
  MessageSquare,
  PlusCircle,
  Users,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Search,
  FileCheck,
  Scale,
  Building,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const EmployerPage = () => {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-2 pb-12">
      {/* Employer Glass Hero Banner */}
      <div className="ks-glass-hero p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary dark:text-sky-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Employer Hub • मालक व्यवस्थापन</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {user?.name || 'Employer'}!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Post new gig jobs, discover skilled verified workers via AI match, track active site projects, and record milestones securely.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Transparent Agreement Terms
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary dark:text-sky-400">
                <CheckCircle2 className="w-4 h-4" /> Verified Business Account
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Link
              to="/employer/jobs/create"
              className="ks-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Job</span>
            </Link>
            <Link
              to="/employer/workers"
              className="ks-btn-outline inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <Search className="w-4 h-4" />
              <span>AI Worker Discovery</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Grid Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Posted Jobs */}
        <Link
          to="/employer/jobs"
          className="ks-glass-card-hover p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary dark:group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4">
            <div className="text-base font-bold text-slate-900 dark:text-white">Posted Jobs</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage live job listings & applicant pipelines</div>
          </div>
        </Link>

        {/* Card 2: Active Projects */}
        <Link
          to="/employer/projects"
          className="ks-glass-card-hover p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
              <HardHat className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4">
            <div className="text-base font-bold text-slate-900 dark:text-white">Live Projects</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track daily shift attendance & progress updates</div>
          </div>
        </Link>

        {/* Card 3: Payments & Escrow Ledger */}
        <Link
          to="/employer/payments"
          className="ks-glass-card-hover p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4">
            <div className="text-base font-bold text-slate-900 dark:text-white">Payments & Ledger</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Record disbursements & download invoices</div>
          </div>
        </Link>

        {/* Card 4: Worker Messages */}
        <Link
          to="/employer/messages"
          className="ks-glass-card-hover p-5 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-4">
            <div className="text-base font-bold text-slate-900 dark:text-white">Direct Chat</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time messaging with assigned crew</div>
          </div>
        </Link>
      </div>

      {/* Quick Links Strip with Glass Cards */}
      <div className="ks-glass-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Platform Management & Agreements
          </span>
          <span className="ks-badge-cyan text-[10px]">Employer Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/employer/invitations"
            className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 hover:border-primary/50 flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                Direct Invitations
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Track worker invitations</span>
            </div>
          </Link>

          <Link
            to="/employer/hiring"
            className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-500 transition-colors">
                Hiring Agreements
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Proposals & confirmations</span>
            </div>
          </Link>

          <Link
            to="/employer/disputes"
            className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 hover:border-rose-500/50 flex items-center gap-3 group transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-rose-500 transition-colors">
                Resolution & Disputes
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Mediated support center</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmployerPage;
