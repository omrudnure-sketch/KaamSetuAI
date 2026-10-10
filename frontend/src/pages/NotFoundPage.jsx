import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="w-full max-w-xl bg-slate-850 border border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-4">
      <div className="inline-flex p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-white">404 - Page Not Found</h2>
      <p className="text-slate-400">The requested page does not exist.</p>
      <Link
        to="/"
        className="inline-block mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
};
