import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar, Footer, AiAssistantModal } from '../components/index.js';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto pt-16 md:pt-20 pb-20 md:pb-24 px-4 sm:px-6 flex flex-col">
        <Outlet />
      </main>
      <AiAssistantModal />
      <Footer />
    </div>
  );
};


