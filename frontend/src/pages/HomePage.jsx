import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, BarChart3, BriefcaseBusiness, Building2, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, HardHat, Languages,
  MapPin, Menu, MessageCircle, Palette, PencilRuler, Search, ShieldCheck,
  Sparkles, Star, TrendingUp, Users, Wrench, X, Zap,
} from 'lucide-react';

const stats = [
  ['10K+', 'Skilled workers', 'placeholder'],
  ['2.4K+', 'Job opportunities', 'placeholder'],
  ['8.7K+', 'Successful connections', 'placeholder'],
  ['12', 'Job categories', 'platform scope'],
];

const categories = [
  { icon: HardHat, name: 'Construction', text: 'Reliable hands for every build.' },
  { icon: Zap, name: 'Electrical work', text: 'Power your project safely.' },
  { icon: Wrench, name: 'Plumbing', text: 'Fixes that keep things flowing.' },
  { icon: Palette, name: 'Painting', text: 'Bring every space to life.' },
  { icon: PencilRuler, name: 'Carpentry', text: 'Crafted work, built to last.' },
  { icon: Users, name: 'General labour', text: 'Extra support when you need it.' },
];

const features = [
  { icon: Sparkles, title: 'AI-powered matching', text: 'Find the right fit using skills, location, experience and ratings.' },
  { icon: MapPin, title: 'Nearby opportunities', text: 'Discover work close to home and talent close to your site.' },
  { icon: BadgeCheck, title: 'Transparent profiles', text: 'See skills, work history, reviews and availability in one place.' },
  { icon: Languages, title: 'Your language, your way', text: 'Choose English, Hindi or Marathi for a more comfortable experience.' },
  { icon: MessageCircle, title: 'Clear communication', text: 'Stay aligned after an agreement with relevant contact details.' },
  { icon: BarChart3, title: 'Project visibility', text: 'Track attendance, progress, wages and mutually approved extensions.' },
];

const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

function SectionHeading({ eyebrow, title, text, light = false }) {
  return <div className={`max-w-2xl ${light ? 'text-white' : ''}`}>
    <p className={`eyebrow ${light ? 'text-cyan-200' : ''}`}>{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
    {text && <p className={`mt-5 text-base leading-8 ${light ? 'text-blue-100' : 'text-slate-600'}`}>{text}</p>}
  </div>;
}

function HeroVisual() {
  return <div className="hero-visual relative mx-auto h-[430px] w-full max-w-[560px] lg:h-[510px]">
    <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
    <div className="hero-network network-one" /><div className="hero-network network-two" />
    <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="profile-float profile-top">
      <div className="avatar avatar-cyan">RK</div><div><strong>Ramesh Kumar</strong><span>Electrician · 4.9 ★</span></div><BadgeCheck className="ml-auto text-cyan-500" size={18} />
    </motion.div>
    <motion.div animate={{ y: [0, 14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="profile-float profile-bottom">
      <div className="avatar avatar-orange">AS</div><div><strong>Anita Sharma</strong><span>Project owner · Pune</span></div><span className="live-dot" />
    </motion.div>
    <div className="hero-card-main">
      <div className="hero-card-header"><div><span className="tiny-label">SMART MATCH</span><h3>Perfect fit found</h3></div><div className="match-score">96%</div></div>
      <div className="match-line"><div className="avatar avatar-blue">VP</div><div className="match-person"><strong>Vikram Patil</strong><span>Construction · 8 years experience</span><div className="match-tags"><span>Nearby</span><span>Available today</span></div></div></div>
      <div className="match-details"><span><MapPin size={14} /> 2.4 km away</span><span><Star size={14} fill="currentColor" /> 4.8 rating</span></div>
      <button className="connect-button">View profile <ArrowRight size={16} /></button>
    </div>
    <div className="location-pin pin-a"><MapPin size={17} /></div><div className="location-pin pin-b"><MapPin size={13} /></div>
  </div>;
}

function AppLink({ children, to = '/register', variant = 'primary', className = '' }) {
  return <Link to={to} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${variant === 'primary' ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300' : variant === 'white' ? 'bg-white text-blue-950 hover:bg-cyan-50' : 'border border-white/20 text-white hover:bg-white/10'} ${className}`}>{children}</Link>;
}

export const HomePage = () => {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonial, setTestimonial] = useState(0);
  const testimonials = [
    ['“Sample testimonial — this is where a real worker story can be added later.”', 'Placeholder name', 'Electrician'],
    ['“Sample testimonial — clear hiring and project visibility in one place.”', 'Placeholder name', 'Small business owner'],
  ];
  useEffect(() => { document.title = 'KaamSetu AI | Find skilled workers. Get work done.'; }, []);
  const motionProps = reduceMotion ? {} : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.15 }, variants: reveal };

  return <div className="landing-page">
    <header className="landing-nav"><div className="landing-container nav-inner">
      <Link to="/" className="brand"><span className="brand-mark"><BriefcaseBusiness size={19} /></span><span>KaamSetu <b>AI</b></span></Link>
      <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        {['How it works', 'Find workers', 'For workers', 'For employers', 'About us'].map((item, i) => <a href={`#${['how-it-works', 'categories', 'workers', 'employers', 'about'][i]}`} key={item} onClick={() => setMenuOpen(false)}>{item}</a>)}
        <div className="mobile-nav-actions"><Link to="/login">Login</Link><AppLink>Get started <ArrowRight size={15} /></AppLink></div>
      </nav>
      <div className="nav-actions"><Link to="/login" className="login-link">Login</Link><AppLink>Get started <ArrowRight size={15} /></AppLink></div>
      <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div></header>

    <main>
      <section className="hero-section"><div className="landing-container hero-grid">
        <motion.div {...motionProps} className="hero-copy"><div className="announcement"><span className="announcement-dot" /> Built for the people who keep India moving <ArrowRight size={14} /></div>
          <h1>Find skilled workers.<br /><span>Get work done.</span><br />Grow together.</h1>
          <p>KaamSetu AI connects skilled workers with trusted employers. Discover nearby opportunities, hire verified talent and manage projects with confidence.</p>
          <div className="hero-actions"><AppLink to="/register?role=worker">Find work <ArrowRight size={17} /></AppLink><AppLink to="/register?role=employer" variant="outline">Hire workers <ArrowRight size={17} /></AppLink></div>
          <a className="how-link" href="#how-it-works"><span className="play-icon">▹</span> Explore how it works</a>
          <div className="hero-trust"><div className="trust-avatars"><span>RK</span><span>AS</span><span>VP</span><span>+</span></div><div><div className="stars">★★★★★ <small>4.9/5</small></div><p>Loved by workers & employers</p></div></div>
        </motion.div><HeroVisual />
      </div></section>

      <section className="stats-strip"><div className="landing-container stats-grid">{stats.map(([value, label, note]) => <div className="stat-item" key={label}><strong>{value}</strong><span>{label}</span><small>{note === 'placeholder' ? 'Illustrative placeholder' : 'Current platform scope'}</small></div>)}</div></section>

      <section id="how-it-works" className="section section-white"><div className="landing-container"><motion.div {...motionProps}><SectionHeading eyebrow="Simple by design" title="From first hello to finished project." text="A better way for workers and employers to find each other, align on expectations and get moving." /></motion.div><div className="steps-grid">
        {[['01', Search, 'Create your profile', 'Share your skills, experience, location and availability.'], ['02', Sparkles, 'Find your match', 'Get smart recommendations based on what matters to you.'], ['03', Check, 'Work with confidence', 'Agree clearly, communicate directly and track progress.']].map(([num, Icon, title, text]) => <motion.div {...motionProps} className="step-card" key={num}><span className="step-number">{num}</span><div className="step-icon"><Icon size={23} /></div><h3>{title}</h3><p>{text}</p></motion.div>)}
      </div></div></section>

      <section id="categories" className="section section-soft"><div className="landing-container"><motion.div {...motionProps}><SectionHeading eyebrow="Find your craft" title="Work that fits your skills." text="Explore opportunities across the categories that keep homes, businesses and communities moving." /></motion.div><div className="category-grid">{categories.map(({ icon: Icon, name, text }) => <motion.div {...motionProps} className="category-card" key={name}><div className="category-icon"><Icon size={24} /></div><h3>{name}</h3><p>{text}</p><ArrowRight className="category-arrow" size={18} /></motion.div>)}</div></div></section>

      <section id="workers" className="section split-section"><div className="landing-container split-grid"><div className="split-visual worker-visual"><div className="visual-glow" /><div className="availability-card"><div className="availability-top"><span className="availability-status" /> Available for work <span>Today</span></div><div className="worker-large"><div className="avatar avatar-xl">SP</div><div><strong>Suresh Pawar</strong><span>Carpenter · 6 years</span><div className="rating"><Star size={13} fill="currentColor" /> 4.9 <em>· 28 jobs</em></div></div></div><div className="skill-bar"><span>Profile strength</span><b>92%</b><div><i style={{ width: '92%' }} /></div></div></div><div className="floating-chip chip-location"><MapPin size={16} /> Jobs near you</div><div className="floating-chip chip-income"><TrendingUp size={16} /> Build your history</div></div><motion.div {...motionProps} className="split-copy"><p className="eyebrow">For workers</p><h2>Your skills deserve better opportunities.</h2><p>Discover nearby jobs, showcase your skills, build your work history and connect with employers who value what you do.</p><ul><li><Check size={17} /> Choose your language</li><li><Check size={17} /> Set your own availability</li><li><Check size={17} /> Keep your work history with you</li></ul><AppLink to="/register?role=worker">Find work today <ArrowRight size={17} /></AppLink></motion.div></div></section>

      <section id="employers" className="section employer-section"><div className="landing-container split-grid employer-grid"><motion.div {...motionProps} className="split-copy"><p className="eyebrow">For employers</p><h2>Find the right people for every project.</h2><p>Discover skilled workers, compare profiles, manage hiring and track project progress — without the usual guesswork.</p><div className="mini-metrics"><div><strong>96%</strong><span>match confidence</span></div><div><strong>2.4 km</strong><span>average distance</span></div></div><AppLink to="/register?role=employer">Hire skilled workers <ArrowRight size={17} /></AppLink></motion.div><div className="employer-visual"><div className="dashboard-card"><div className="dash-top"><span>Project team</span><span className="dash-dot" /></div><div className="dash-row"><div className="avatar avatar-sm avatar-blue">VP</div><div><strong>Vikram Patil</strong><span>Construction · 4.8 ★</span></div><BadgeCheck size={17} className="text-cyan-500 ml-auto" /></div><div className="dash-row"><div className="avatar avatar-sm avatar-purple">NK</div><div><strong>Neha Kulkarni</strong><span>Painting · 4.9 ★</span></div><BadgeCheck size={17} className="text-cyan-500 ml-auto" /></div><div className="dash-footer"><span><Clock3 size={14} /> Start Monday</span><span><Users size={14} /> 2 workers</span></div></div></div></div></section>

      <section className="section feature-section"><div className="landing-container"><motion.div {...motionProps} className="feature-heading"><SectionHeading eyebrow="More than a marketplace" title="Everything you need to work better." text="Thoughtful tools for the moments before, during and after a job." /><AppLink to="/register" variant="dark">Get started <ArrowRight size={17} /></AppLink></motion.div><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <motion.div {...motionProps} className="feature-card" key={title}><div className="feature-icon"><Icon size={21} /></div><h3>{title}</h3><p>{text}</p></motion.div>)}</div></div></section>

      <section id="about" className="trust-section"><div className="landing-container trust-grid"><motion.div {...motionProps}><SectionHeading light eyebrow="Built on clarity" title="Good work starts with trust." text="KaamSetu AI keeps the important details visible, so both sides can make informed decisions and build better working relationships." /><div className="trust-list"><span><ShieldCheck size={18} /> Clear profiles and ratings</span><span><BriefcaseBusiness size={18} /> Agreements you understand</span><span><BarChart3 size={18} /> Attendance and progress tracking</span></div></motion.div><div className="trust-card"><ShieldCheck size={30} /><h3>Transparent from day one.</h3><p>See expectations, wage information and project details before you say yes.</p><div className="trust-card-line"><span /> <span /> <span /></div></div></div></section>

      <section className="section testimonial-section"><div className="landing-container testimonial-wrap"><div><p className="eyebrow">Early voices</p><h2>Real people. <br />Real potential.</h2><p className="testimonial-note">Sample testimonials shown for design purposes. Replace with verified stories when available.</p><div className="testimonial-controls"><button aria-label="Previous testimonial" onClick={() => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length)}><ChevronLeft size={19} /></button><button aria-label="Next testimonial" onClick={() => setTestimonial((testimonial + 1) % testimonials.length)}><ChevronRight size={19} /></button></div></div><div className="quote-card"><div className="quote-mark">“</div><p>{testimonials[testimonial][0]}</p><div className="quote-person"><div className="avatar avatar-sm avatar-orange">PN</div><div><strong>{testimonials[testimonial][1]}</strong><span>{testimonials[testimonial][2]}</span></div><div className="quote-stars">★★★★★</div></div></div></div></section>

      <section className="final-cta"><div className="landing-container final-inner"><div className="cta-orb" /><p className="eyebrow text-cyan-200">One platform. More possibilities.</p><h2>Your next opportunity<br />starts here.</h2><p>Whether you are looking for work or searching for skilled talent, your connection starts with KaamSetu AI.</p><div className="hero-actions"><AppLink to="/register?role=worker" variant="white">Join as worker <ArrowRight size={17} /></AppLink><AppLink to="/register?role=employer" variant="outline">Join as employer <ArrowRight size={17} /></AppLink></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-container footer-grid"><div><Link to="/" className="brand brand-footer"><span className="brand-mark"><BriefcaseBusiness size={19} /></span><span>KaamSetu <b>AI</b></span></Link><p>Connecting skills with opportunity.<br />Building better work, together.</p></div><div><h3>Explore</h3><a href="#how-it-works">How it works</a><a href="#categories">Job categories</a><a href="#workers">For workers</a><a href="#employers">For employers</a></div><div><h3>Resources</h3><Link to="/login">Login</Link><Link to="/register">Get started</Link><a href="#about">About us</a><a href="mailto:hello@kaamsetu.ai">Contact us</a></div><div><h3>Legal</h3><a href="#">Privacy policy</a><a href="#">Terms & conditions</a><p className="footer-placeholder">Contact details placeholder</p></div></div><div className="landing-container footer-bottom"><span>© 2026 KaamSetu AI. All rights reserved.</span><span>Made for the people who keep India moving.</span></div></footer>
  </div>;
};
