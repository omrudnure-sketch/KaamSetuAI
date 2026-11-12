import React from 'react';

/**
 * KaamSetu AI Modern Logo Mark
 * Visual concept: Two architectural pillars (Worker in Royal Blue & Employer in Golden Amber)
 * connected by an illuminated suspension arch (Setu in Emerald-Teal) with suspension cables,
 * radiating shockwave ripples, and an illuminated AI nexus.
 */
export const KaamSetuLogo = ({
  size = 40,
  animated = false,
  isIntro = false,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="KaamSetu AI Logo — Connecting Workers and Employers"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm overflow-visible"
      >
        <defs>
          {/* Worker Pillar Gradient (Deep Royal to Vibrant Electric Blue) */}
          <linearGradient id="ks-blue-grad" x1="10" y1="38" x2="22" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#001d5c" />
            <stop offset="45%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Employer Pillar Gradient (Deep Amber to Radiant Sun Gold) */}
          <linearGradient id="ks-amber-grad" x1="38" y1="38" x2="26" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="45%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Setu Bridge Arch Gradient (Cyan to Emerald to Amber) */}
          <linearGradient id="ks-bridge-grad" x1="10" y1="28" x2="38" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Suspension Cable Gradient */}
          <linearGradient id="ks-cable-grad" x1="24" y1="20" x2="24" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
          </linearGradient>

          {/* Beacon Glow Filter */}
          <filter id="ks-beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Enhanced AI Spark Filter */}
          <filter id="ks-spark-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Foundation Deck Beam */}
        <line
          x1="6"
          y1="38"
          x2="42"
          y2="38"
          stroke="#1e3a8a"
          strokeWidth="2.8"
          strokeLinecap="round"
          className={isIntro ? 'ks-intro-deck' : ''}
          opacity="0.9"
        />

        {/* Suspension Vertical Cable Ties (Setu Bridge Architecture) */}
        <g className={isIntro ? 'ks-intro-cables' : ''} opacity="0.65">
          <line x1="14.5" y1="27.5" x2="14.5" y2="38" stroke="url(#ks-cable-grad)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="19" y1="21.5" x2="19" y2="38" stroke="url(#ks-cable-grad)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="29" y1="21.5" x2="29" y2="38" stroke="url(#ks-cable-grad)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="33.5" y1="27.5" x2="33.5" y2="38" stroke="url(#ks-cable-grad)" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Left Pillar: Worker Foundation (Blue Tower) */}
        <g className={isIntro ? 'ks-intro-left' : animated ? 'transition-transform duration-300 hover:-translate-x-0.5' : ''}>
          <path
            d="M10 38V24C10 18.477 14.477 14 20 14H21.5V18.5H20C16.962 18.5 14.5 20.962 14.5 24V38H10Z"
            fill="url(#ks-blue-grad)"
          />
          {/* Subtle Worker Node Indicator */}
          <circle cx="12.25" cy="24" r="1.35" fill="#bae6fd" opacity="0.95" />
          {/* Bevel highlight */}
          <line x1="11.2" y1="26" x2="11.2" y2="36" stroke="#ffffff" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />
        </g>

        {/* Right Pillar: Employer Foundation (Amber Gold Tower) */}
        <g className={isIntro ? 'ks-intro-right' : animated ? 'transition-transform duration-300 hover:translate-x-0.5' : ''}>
          <path
            d="M38 38V24C38 18.477 33.523 14 28 14H26.5V18.5H28C31.038 18.5 33.5 20.962 33.5 24V38H38Z"
            fill="url(#ks-amber-grad)"
          />
          {/* Subtle Enterprise Node Indicator */}
          <circle cx="35.75" cy="24" r="1.35" fill="#fef08a" opacity="0.95" />
          {/* Bevel highlight */}
          <line x1="36.8" y1="26" x2="36.8" y2="36" stroke="#ffffff" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />
        </g>

        {/* The Setu: Connecting Bridge Arch */}
        <path
          d="M10 32.5C14.5 24 19 20 24 20C29 20 33.5 24 38 32.5"
          stroke="url(#ks-bridge-grad)"
          strokeWidth="3.4"
          strokeLinecap="round"
          className={isIntro ? 'ks-intro-bridge' : ''}
        />

        {/* Intro Expanding Shockwave Rings */}
        {isIntro && (
          <g>
            <circle cx="24" cy="14" r="3" fill="none" stroke="#10b981" className="ks-intro-ripple-1" />
            <circle cx="24" cy="14" r="3" fill="none" stroke="#38bdf8" className="ks-intro-ripple-2" />
          </g>
        )}

        {/* Center AI Nexus Spark & Beacon */}
        <g className={isIntro ? 'ks-intro-beacon' : 'ks-ambient-beacon'}>
          {/* Halo Glow */}
          <circle
            cx="24"
            cy="14"
            r="5"
            fill="#10b981"
            opacity="0.3"
            filter="url(#ks-beacon-glow)"
          />

          {/* Outer Beacon Node */}
          <circle cx="24" cy="14" r="3.2" fill="#10b981" />

          {/* Radiant Core Spark */}
          <circle cx="24" cy="14" r="1.4" fill="#ffffff" filter="url(#ks-spark-glow)" />

          {/* Crosshair Connectivity Rays */}
          <g className={isIntro ? 'ks-intro-rays' : ''}>
            <line x1="24" y1="6" x2="24" y2="9.5" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="24" y1="18.5" x2="24" y2="22" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="16" y1="14" x2="19.5" y2="14" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="28.5" y1="14" x2="32" y2="14" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
            {/* Diagonal AI Energy Sparkles */}
            <circle cx="19" cy="9" r="0.75" fill="#38bdf8" opacity="0.8" />
            <circle cx="29" cy="9" r="0.75" fill="#fbbf24" opacity="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default KaamSetuLogo;
