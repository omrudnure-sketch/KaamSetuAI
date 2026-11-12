import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { BackButton } from '../components/index.js';

export const NotFoundPage = () => {
  return (
    <div className="w-full max-w-lg ks-glass-card p-8 sm:p-10 text-center space-y-5 mx-auto my-16 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="inline-flex p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 shadow-xs">
        <HelpCircle className="w-8 h-8" />
      </div>
      <div>
        <span className="ks-badge-cyan text-xs mb-2">Error 404</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Page Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
          The page you are looking for doesn't exist, has been moved, or the link may be outdated.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <BackButton size="md" variant="glass" label="Go Back" />
        <Link
          to="/"
          className="ks-btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-bold shadow-xs"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
