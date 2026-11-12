import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HardHat,
  Languages,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  Palette,
  PencilRuler,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ThemeToggleButton } from '../components/ThemeToggleButton.jsx';
import { KaamSetuLogo } from '../components/KaamSetuLogo.jsx';
import '../styles/landing-page.css';

const platformPillars = [
  { value: 'Verified', label: 'Trade Profiles', note: 'Transparent skills and work history' },
  { value: 'Direct', label: 'Wage Logging', note: 'Transparent daily attendance records' },
  { value: 'Clear', label: 'Agreements', note: 'Plain-language digital terms' },
  { value: '3', label: 'Languages', note: 'Marathi, Hindi, and English support' },
];

const categories = [
  { icon: HardHat, name: 'Construction', text: 'Reliable hands for masonry, RCC & civil site builds.' },
  { icon: Zap, name: 'Electrical work', text: 'Power wiring, conduit installation & switchboard safety.' },
  { icon: Wrench, name: 'Plumbing', text: 'Piping, leak repairs, drainage & sanitary fittings.' },
  { icon: Palette, name: 'Painting', text: 'Interior distemper, exterior weather-coat & finishing.' },
  { icon: PencilRuler, name: 'Carpentry', text: 'Furniture woodwork, door fittings & precision framing.' },
  { icon: Users, name: 'General labour', text: 'Material shifting, site clearance & loading support.' },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    text: 'Intelligently match jobs with workers based on skills, location distance, hourly rates and proven experience.',
  },
  {
    icon: MapPin,
    title: 'Nearby Opportunities',
    text: 'Discover jobs close to your residence or find skilled workers located minutes from your job site.',
  },
  {
    icon: BadgeCheck,
    title: 'Transparent Profiles',
    text: 'Review past project history, photo proofs, peer ratings, and daily wage expectations before agreeing.',
  },
  {
    icon: Languages,
    title: 'Multi-Lingual Experience',
    text: 'Full support for Marathi (मराठी), Hindi (हिंदी) and English for clear and comfortable communication.',
  },
  {
    icon: MessageCircle,
    title: 'Direct Chat & Updates',
    text: 'Built-in real-time messaging keeps both sides synchronized with instant progress updates and notifications.',
  },
  {
    icon: BarChart3,
    title: 'Attendance & Milestone Tracking',
    text: 'Track daily attendance punches, verified work progress, approved wages, and mutual project extensions.',
  },
];

const testimonials = [
  [
    '“कामसेतू AI मुळे मला पुण्यात वीजकामाची (Electrical) रोजची कामे नियमित मिळतात. हजेरी आणि मजुरी थेट पारदर्शकपणे दिसते.”',
    'Ramesh Kumar',
    'Certified Electrician · Pune',
  ],
  [
    '“KaamSetu AI made finding verified carpenters and painters for our interior project seamless. Clear contracts and daily tracking gave us complete peace of mind.”',
    'Anita Sharma',
    'Project Owner · Mumbai',
  ],
  [
    '“रोजगार शोधणे आता सोपे झाले आहे. स्थानिक कामांची माहिती लगेच मिळते आणि पेमेंटची वेळोवेळी नोंद राहते.”',
    'Suresh Pawar',
    'Master Carpenter · Nashik',
  ],
];

const revealVariant = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function SectionHeading({ eyebrow, title, text, light = false }) {
  return (
    <div className={`max-w-2xl ${light ? 'text-white' : ''}`}>
      <p className={`eyebrow ${light ? 'text-cyan-200' : ''}`}>{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
      {text && (
        <p className={`mt-5 text-base leading-8 ${light ? 'text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
          {text}
        </p>
      )}
    </div>
  );
}

function HeroVisual({ getEmployerTarget }) {
  const reduceMotion = useReducedMotion();

  const floatTop = reduceMotion
    ? {}
    : { animate: { y: [0, -10, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } };

  const floatBottom = reduceMotion
    ? {}
    : { animate: { y: [0, 12, 0] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' } };

  return (
    <div className="hero-visual relative mx-auto h-[440px] w-full max-w-[560px] lg:h-[510px]">
      <div className="hero-orb orb-one" />
      <div className="hero-orb orb-two" />
      <div className="hero-network network-one" />
      <div className="hero-network network-two" />

      {/* Floating Worker Profile Card */}
      <motion.div {...floatTop} className="profile-float profile-top">
        <div className="avatar avatar-cyan">RK</div>
        <div>
          <strong>Ramesh Kumar</strong>
          <span>Electrician · 4.9 ★</span>
        </div>
        <BadgeCheck className="ml-auto text-cyan-400" size={18} />
      </motion.div>

      {/* Floating Employer / Project Owner Card */}
      <motion.div {...floatBottom} className="profile-float profile-bottom">
        <div className="avatar avatar-orange">AS</div>
        <div>
          <strong>Anita Sharma</strong>
          <span>Project Owner · Pune</span>
        </div>
        <span className="live-dot" />
      </motion.div>

      {/* Main Glassmorphic AI Smart Match Showcase */}
      <div className="hero-card-main">
        <div className="hero-card-header">
          <div>
            <span className="tiny-label">SMART MATCH</span>
            <h3>Perfect Match Found</h3>
          </div>
          <div className="match-score">96%</div>
        </div>

        <div className="match-line">
          <div className="avatar avatar-blue">VP</div>
          <div className="match-person">
            <strong>Vikram Patil</strong>
            <span>Construction · 8 yrs experience</span>
            <div className="match-tags">
              <span>Nearby</span>
              <span>Available Today</span>
            </div>
          </div>
        </div>

        <div className="match-details">
          <span>
            <MapPin size={14} /> 2.4 km away
          </span>
          <span>
            <Star size={14} fill="currentColor" /> 4.8 Rating
          </span>
        </div>

        <Link to={getEmployerTarget} className="connect-button">
          View Profile <ArrowRight size={16} />
        </Link>
      </div>

      {/* Dynamic Location Pin Badges */}
      <div className="location-pin pin-a" title="Active Opportunity Location">
        <MapPin size={18} />
      </div>
      <div className="location-pin pin-b" title="Worker Match Nearby">
        <MapPin size={14} />
      </div>
    </div>
  );
}

function AppLink({ children, to = '/register', variant = 'primary', className = '' }) {
  let styleClasses = 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/25 hover:bg-cyan-300';
  if (variant === 'white') {
    styleClasses = 'bg-white text-blue-950 hover:bg-cyan-50 shadow-md';
  } else if (variant === 'outline') {
    styleClasses = 'border border-white/25 text-white hover:bg-white/10 backdrop-blur-sm';
  } else if (variant === 'dark') {
    styleClasses = 'bg-slate-900 text-white hover:bg-slate-800 shadow-md border border-slate-700/50';
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 select-none ${styleClasses} ${className}`}
    >
      {children}
    </Link>
  );
}

export const HomePage = () => {
  const reduceMotion = useReducedMotion();
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    document.title = 'KaamSetu AI (कामसेतू) | Smart Gig Worker Hiring Platform';
  }, []);

  // Determine intelligent targets based on authentication status & role
  const isWorker = isAuthenticated && user?.role === 'worker';
  const isEmployer = isAuthenticated && user?.role === 'employer';
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const workerTarget = isWorker ? '/worker' : '/register?role=worker';
  const employerTarget = isEmployer ? '/employer' : '/register?role=employer';
  const findWorkersTarget = isEmployer ? '/employer/workers' : '/register?role=employer';

  let dashboardTarget = '/login';
  let dashboardLabel = 'Login';
  if (isWorker) {
    dashboardTarget = '/worker';
    dashboardLabel = 'Worker Portal';
  } else if (isEmployer) {
    dashboardTarget = '/employer';
    dashboardLabel = 'Employer Portal';
  } else if (isAdmin) {
    dashboardTarget = '/admin';
    dashboardLabel = 'Admin Portal';
  }

  const motionProps = reduceMotion
    ? {}
    : {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: { once: true, amount: 0.15 },
        variants: revealVariant,
      };

  const handleNavScroll = (e, sectionId) => {
    e.preventDefault();
    setMenuOpen(false);
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Top Floating Glass Navigation */}
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <Link to="/" className="brand" aria-label="KaamSetu AI Homepage">
            <span className="brand-mark">
              <KaamSetuLogo size={26} />
            </span>
            <span>
              KaamSetu <b>AI</b>
            </span>
          </Link>

          <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main Navigation">
            <a href="#how-it-works" onClick={(e) => handleNavScroll(e, 'how-it-works')}>
              How it works
            </a>
            <a href="#categories" onClick={(e) => handleNavScroll(e, 'categories')}>
              Find workers
            </a>
            <a href="#workers" onClick={(e) => handleNavScroll(e, 'workers')}>
              For workers
            </a>
            <a href="#employers" onClick={(e) => handleNavScroll(e, 'employers')}>
              For employers
            </a>
            <a href="#about" onClick={(e) => handleNavScroll(e, 'about')}>
              About us
            </a>

            <div className="mobile-nav-actions">
              <div className="flex items-center gap-2">
                <ThemeToggleButton size="sm" />
                <Link to={dashboardTarget} className="text-sm font-bold text-white hover:text-cyan-300">
                  {dashboardLabel}
                </Link>
              </div>
              <AppLink to={isAuthenticated ? dashboardTarget : '/register'} className="text-xs py-2 px-4">
                {isAuthenticated ? 'Open Portal' : 'Get Started'} <ArrowRight size={14} />
              </AppLink>
            </div>
          </nav>

          <div className="nav-actions">
            <ThemeToggleButton size="sm" />
            {isAuthenticated ? (
              <Link
                to={dashboardTarget}
                className="inline-flex items-center gap-1.5 login-link font-bold text-sm text-cyan-300 hover:text-cyan-200"
              >
                <LayoutDashboard size={16} />
                <span>{dashboardLabel}</span>
              </Link>
            ) : (
              <Link to="/login" className="login-link font-bold text-sm text-white hover:text-cyan-300">
                Login
              </Link>
            )}
            <AppLink to={isAuthenticated ? dashboardTarget : '/register'} className="py-2.5 px-5 text-xs">
              {isAuthenticated ? 'Dashboard' : 'Get Started'} <ArrowRight size={15} />
            </AppLink>
          </div>

          <button
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Main Landing Sections */}
      <main id="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="landing-container hero-grid">
            <motion.div {...motionProps} className="hero-copy">
              <div className="announcement">
                <span className="announcement-dot" />
                <span>Built for the people who keep India moving</span>
                <ArrowRight size={13} />
              </div>

              <h1>
                Find skilled workers.
                <br />
                <span>Get work done.</span>
                <br />
                Grow together.
              </h1>

              <p>
                KaamSetu AI connects skilled gig workers with trusted employers. Discover nearby opportunities, hire
                verified talent, and manage daily projects with complete confidence.
              </p>

              <div className="hero-actions">
                <AppLink to={workerTarget} variant="primary">
                  {isWorker ? 'Go to Worker Portal' : 'Find Work'} <ArrowRight size={16} />
                </AppLink>
                <AppLink to={employerTarget} variant="outline">
                  {isEmployer ? 'Go to Employer Portal' : 'Hire Workers'} <ArrowRight size={16} />
                </AppLink>
              </div>

              <a
                className="how-link"
                href="#how-it-works"
                onClick={(e) => handleNavScroll(e, 'how-it-works')}
              >
                <span className="play-icon">▹</span> Explore how it works
              </a>

              <div className="hero-trust">
                <div className="trust-avatars">
                  <span>RK</span>
                  <span>AS</span>
                  <span>VP</span>
                  <span>SP</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Empowering skilled blue-collar workers</p>
                  <p className="text-xs text-slate-300">Connecting verified gig talent and site owners across Maharashtra</p>
                </div>
              </div>
            </motion.div>

            <HeroVisual getEmployerTarget={findWorkersTarget} />
          </div>
        </section>

        {/* Platform Guarantees Strip */}
        <section className="stats-strip" aria-label="Platform Guarantees">
          <div className="landing-container stats-grid">
            {platformPillars.map(({ value, label, note }) => (
              <div className="stat-item" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <small>{note}</small>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="section section-white">
          <div className="landing-container">
            <motion.div {...motionProps}>
              <SectionHeading
                eyebrow="Simple By Design"
                title="From first hello to finished project."
                text="A straightforward and transparent workflow for workers and employers to connect, agree on wages and complete work seamlessly."
              />
            </motion.div>

            <div className="steps-grid">
              {[
                [
                  '01',
                  Search,
                  'Create Your Profile',
                  'Share your skills, experience, location, and daily availability in Marathi, Hindi or English.',
                ],
                [
                  '02',
                  Sparkles,
                  'Find Your Smart Match',
                  'Get AI-powered recommendations based on trade category, verified skills, and nearby proximity.',
                ],
                [
                  '03',
                  Check,
                  'Work With Confidence',
                  'Sign a clear hiring agreement, punch daily attendance, upload photo proofs and track wages.',
                ],
              ].map(([num, Icon, title, text]) => (
                <motion.div {...motionProps} className="step-card" key={num}>
                  <span className="step-number">{num}</span>
                  <div className="step-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Job Categories Showcase */}
        <section id="categories" className="section section-soft">
          <div className="landing-container">
            <motion.div {...motionProps}>
              <SectionHeading
                eyebrow="Find Your Trade"
                title="Work that fits your skills."
                text="Explore verified opportunities across essential trades that power homes, commercial sites and community infrastructure."
              />
            </motion.div>

            <div className="category-grid">
              {categories.map(({ icon: Icon, name, text }) => (
                <motion.div
                  {...motionProps}
                  className="category-card"
                  key={name}
                  onClick={() => {
                    const target = isWorker ? '/worker/jobs' : findWorkersTarget;
                    window.location.href = target;
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.location.href = isWorker ? '/worker/jobs' : findWorkersTarget;
                    }
                  }}
                >
                  <div className="category-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{name}</h3>
                  <p>{text}</p>
                  <ArrowRight className="category-arrow" size={18} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* For Workers Section */}
        <section id="workers" className="section split-section">
          <div className="landing-container split-grid">
            <div className="split-visual worker-visual">
              <div className="visual-glow" />

              <div className="availability-card">
                <div className="availability-top">
                  <span className="availability-status" />
                  <span>Available for work</span>
                  <span>Today</span>
                </div>
                <div className="worker-large">
                  <div className="avatar avatar-xl">SP</div>
                  <div>
                    <strong>Suresh Pawar</strong>
                    <span>Carpenter · 6 Years Experience</span>
                    <div className="rating">
                      <Star size={13} fill="currentColor" /> 4.9 <em>· 28 Completed Jobs</em>
                    </div>
                  </div>
                </div>
                <div className="skill-bar">
                  <span>Profile Strength & Verification</span>
                  <b>94%</b>
                  <div>
                    <i style={{ width: '94%' }} />
                  </div>
                </div>
              </div>

              <div className="floating-chip chip-location">
                <MapPin size={16} /> Jobs within 5 km
              </div>
              <div className="floating-chip chip-income">
                <TrendingUp size={16} /> Verified Daily Wages
              </div>
            </div>

            <motion.div {...motionProps} className="split-copy">
              <p className="eyebrow">For Workers • कामगारांसाठी</p>
              <h2>Your skills deserve better opportunities.</h2>
              <p>
                Discover jobs near your doorstep, showcase your verified work experience, set your own daily availability,
                and connect directly with employers who respect your craft.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Choose your preferred language (Marathi, Hindi, English)
                </li>
                <li>
                  <Check size={16} /> Set real-time daily availability status in one click
                </li>
                <li>
                  <Check size={16} /> Build an unalterable portfolio of completed jobs and peer reviews
                </li>
              </ul>
              <AppLink to={workerTarget}>
                {isWorker ? 'Browse Worker Jobs' : 'Find Work Today'} <ArrowRight size={17} />
              </AppLink>
            </motion.div>
          </div>
        </section>

        {/* For Employers Section */}
        <section id="employers" className="section employer-section">
          <div className="landing-container split-grid employer-grid">
            <motion.div {...motionProps} className="split-copy">
              <p className="eyebrow">For Employers • मालकांसाठी</p>
              <h2>Find the right team for every site.</h2>
              <p>
                Discover skilled gig workers, compare verified ratings, issue digital hiring agreements, punch daily
                attendance, and track milestone progress without the usual guesswork.
              </p>
              <div className="mini-metrics">
                <div>
                  <strong>Direct</strong>
                  <span>Hiring Terms</span>
                </div>
                <div>
                  <strong>Daily</strong>
                  <span>Attendance Logs</span>
                </div>
              </div>
              <AppLink to={employerTarget}>
                {isEmployer ? 'Manage Projects' : 'Hire Skilled Workers'} <ArrowRight size={17} />
              </AppLink>
            </motion.div>

            <div className="employer-visual">
              <div className="dashboard-card">
                <div className="dash-top">
                  <span>Active Project Crew</span>
                  <span className="dash-dot" />
                </div>
                <div className="dash-row">
                  <div className="avatar avatar-sm avatar-blue">VP</div>
                  <div>
                    <strong>Vikram Patil</strong>
                    <span>Construction · 4.8 ★</span>
                  </div>
                  <BadgeCheck size={18} className="text-cyan-500 ml-auto" />
                </div>
                <div className="dash-row">
                  <div className="avatar avatar-sm avatar-purple">NK</div>
                  <div>
                    <strong>Neha Kulkarni</strong>
                    <span>Painting & Finish · 4.9 ★</span>
                  </div>
                  <BadgeCheck size={18} className="text-cyan-500 ml-auto" />
                </div>
                <div className="dash-footer">
                  <span>
                    <Clock3 size={14} /> Site Starts Monday
                  </span>
                  <span>
                    <Users size={14} /> 2 Verified Workers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Features Grid */}
        <section className="section feature-section">
          <div className="landing-container">
            <motion.div {...motionProps} className="feature-heading">
              <SectionHeading
                eyebrow="More Than A Marketplace"
                title="Everything you need to work better."
                text="Comprehensive tools built specifically for blue-collar engagements before, during, and after site work."
              />
              <AppLink to={isAuthenticated ? dashboardTarget : '/register'} variant="dark">
                {isAuthenticated ? 'Open Portal' : 'Get Started'} <ArrowRight size={16} />
              </AppLink>
            </motion.div>

            <div className="feature-grid">
              {features.map(({ icon: Icon, title, text }) => (
                <motion.div {...motionProps} className="feature-card" key={title}>
                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Transparency Section */}
        <section id="about" className="trust-section">
          <div className="landing-container trust-grid">
            <motion.div {...motionProps}>
              <SectionHeading
                light
                eyebrow="Built on Trust & Transparency"
                title="Good work starts with mutual clarity."
                text="KaamSetu AI eliminates misunderstandings by keeping daily wages, attendance timestamps, milestone deliverables and terms transparent for both parties from day one."
              />
              <div className="trust-list">
                <span>
                  <ShieldCheck size={18} /> Verified profiles & peer ratings
                </span>
                <span>
                  <BriefcaseBusiness size={18} /> Plain-language digital agreements
                </span>
                <span>
                  <BarChart3 size={18} /> Transparent attendance & daily wage logs
                </span>
              </div>
            </motion.div>

            <div className="trust-card">
              <ShieldCheck size={32} />
              <h3>Transparent from day one.</h3>
              <p>
                Clear expectations, recorded daily attendance, mutual extension approvals, and an integrated dispute
                resolution system safeguard both workers and employers.
              </p>
              <div className="trust-card-line">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Slider */}
        <section className="section testimonial-section">
          <div className="landing-container testimonial-wrap">
            <div>
              <p className="eyebrow">Real Stories • अनुभव</p>
              <h2>
                Real people.
                <br />
                Real progress.
              </h2>
              <p className="testimonial-note">
                Verified feedback from workers and small business owners leveraging KaamSetu AI across Maharashtra.
              </p>
              <div className="testimonial-controls">
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  onClick={() =>
                    setTestimonialIndex(
                      (testimonialIndex + testimonials.length - 1) % testimonials.length
                    )
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next testimonial"
                  onClick={() =>
                    setTestimonialIndex((testimonialIndex + 1) % testimonials.length)
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="quote-card">
              <div className="quote-mark">“</div>
              <p>{testimonials[testimonialIndex][0]}</p>
              <div className="quote-person">
                <div className="avatar avatar-sm avatar-orange">
                  {testimonials[testimonialIndex][1].slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{testimonials[testimonialIndex][1]}</strong>
                  <span>{testimonials[testimonialIndex][2]}</span>
                </div>
                <div className="quote-stars">★★★★★</div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="final-cta">
          <div className="landing-container final-inner">
            <div className="cta-orb" />
            <p className="eyebrow text-cyan-200">One Platform. Greater Possibilities.</p>
            <h2>
              Your next opportunity
              <br />
              starts right here.
            </h2>
            <p>
              Whether you are looking for daily gig work or seeking dependable skilled workers for your project site,
              get connected with KaamSetu AI today.
            </p>
            <div className="hero-actions">
              <AppLink to={workerTarget} variant="white">
                {isWorker ? 'Open Worker Portal' : 'Join as Worker'} <ArrowRight size={17} />
              </AppLink>
              <AppLink to={employerTarget} variant="outline">
                {isEmployer ? 'Open Employer Portal' : 'Join as Employer'} <ArrowRight size={17} />
              </AppLink>
            </div>
          </div>
        </section>
      </main>

      {/* Landing Page Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div>
            <Link to="/" className="brand brand-footer" aria-label="KaamSetu AI Home">
              <span className="brand-mark">
                <KaamSetuLogo size={24} />
              </span>
              <span>
                KaamSetu <b>AI</b>
              </span>
            </Link>
            <p>
              Bridging skilled workers and employers across India.
              <br />
              सुरक्षित काम आणि पारदर्शक रोजगार.
            </p>
          </div>

          <div>
            <h3>Explore</h3>
            <a href="#how-it-works" onClick={(e) => handleNavScroll(e, 'how-it-works')}>
              How it works
            </a>
            <a href="#categories" onClick={(e) => handleNavScroll(e, 'categories')}>
              Job categories
            </a>
            <a href="#workers" onClick={(e) => handleNavScroll(e, 'workers')}>
              For workers
            </a>
            <a href="#employers" onClick={(e) => handleNavScroll(e, 'employers')}>
              For employers
            </a>
          </div>

          <div>
            <h3>Portals</h3>
            <Link to="/login">Login</Link>
            <Link to="/register">Create Account</Link>
            <Link to="/worker">Worker Portal</Link>
            <Link to="/employer">Employer Portal</Link>
          </div>

          <div>
            <h3>Platform</h3>
            <a href="#about" onClick={(e) => handleNavScroll(e, 'about')}>
              About KaamSetu
            </a>
            <a href="mailto:support@kaamsetu.ai">Support & Help</a>
            <span className="text-xs text-slate-500 block mt-2">v1.0.0 · Production Ready</span>
          </div>
        </div>

        <div className="landing-container footer-bottom">
          <span>© 2026 KaamSetu AI. All rights reserved.</span>
          <span>Made with dedication for the workforce that builds India.</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
