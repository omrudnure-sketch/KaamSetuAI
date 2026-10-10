import React from 'react';

export const Footer = () => {
  return (
    <footer className="border-t border-surface-container-high/60 bg-surface-container-low py-6 mt-auto hidden md:block">
      <div className="max-w-6xl mx-auto px-4 text-center text-xs text-on-surface-variant">
        <p>© {new Date().getFullYear()} KaamSetu AI (कामसेतू). Connecting Blue-Collar Workers & Employers.</p>
      </div>
    </footer>
  );
};

