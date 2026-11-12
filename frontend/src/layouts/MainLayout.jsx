import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar, Footer, SmartBackBar, FloatingBackButton } from '../components/index.js';

export const MainLayout = () => {
  const location = useLocation();

  const isLanding = location.pathname === '/';

  if (isLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-400">
      <Navbar />
      <div className="flex-1 w-full max-w-[1560px] mx-auto pt-22 sm:pt-26 md:pt-28 pb-24 lg:pb-14 px-3 sm:px-6 lg:px-8 flex flex-col">
        {/* Universal Animated Back Navigation Bar across all sub-pages */}
        <SmartBackBar />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
      {/* Floating Quick-Back Button for effortless navigation on scroll/mobile */}
      <FloatingBackButton />
      <Footer />
    </div>
  );
};

export default MainLayout;
