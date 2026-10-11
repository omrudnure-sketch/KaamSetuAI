import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-xl mx-auto my-12">
      <div className="inline-flex p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">404 - Page Not Found</h2>
      <p className="text-slate-600">The requested page does not exist.</p>
      <Link
        to="/"
        className="inline-block mt-4 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-md"
      >
        Return Home
      </Link>
    </div>
  );
};
