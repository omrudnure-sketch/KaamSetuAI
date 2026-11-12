import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { KaamSetuLogo } from '../components/KaamSetuLogo.jsx';
import { User, Mail, Lock, Globe, Briefcase, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, register } = useAuth();
  const navigate = useNavigate();

  // Redirect already authenticated users to their portal to prevent back-looping into register
  React.useEffect(() => {
    if (user && user.role) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setLocalError('');
    if (newRole === 'employer') {
      setPreferredLanguage('en');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // 1. Full name validation (max 50 chars)
    const cleanName = name.trim();
    if (!cleanName) {
      setLocalError('Full name is required');
      return;
    }
    if (cleanName.length > 50) {
      setLocalError('Full name cannot exceed 50 characters');
      return;
    }

    // 2. Indian Mobile number validation (mandatory 10 digits starting with 6, 7, 8, or 9)
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setLocalError('Mobile number is required');
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setLocalError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
      return;
    }

    // 3. Role-based email validation
    const cleanEmail = email.trim();
    if (role === 'employer') {
      if (!cleanEmail) {
        setLocalError('Email address is required for employer registration');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setLocalError('Please enter a valid email address');
        return;
      }
    } else if (role === 'worker') {
      // Optional for worker; only validate if supplied
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setLocalError('Please enter a valid email address or leave the field blank');
        return;
      }
    }

    // 4. Password validation
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    // 5. Confirm password match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: cleanName,
      email: cleanEmail ? cleanEmail.toLowerCase() : '',
      phone: cleanPhone,
      password,
      role,
      preferredLanguage: role === 'employer' ? 'en' : preferredLanguage,
    });
    setIsSubmitting(false);

    if (result.success && result.user) {
      navigate(`/${result.user.role}`, { replace: true });
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-14rem)] flex items-center justify-center p-4 sm:p-6 my-auto">
      {/* Centered Liquid Glass Register Card with Smooth Motion */}
      <div className="relative z-10 w-full max-w-[560px] rounded-[28px] border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/85 p-7 sm:p-9 text-slate-900 dark:text-white backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] animate-in fade-in slide-in-from-bottom-3 duration-400 ease-out">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-white/60 dark:border-slate-700/80 flex items-center justify-center p-2 shadow-sm mb-3">
            <KaamSetuLogo size={36} animated={true} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 dark:bg-sky-500/15 text-primary dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-primary/20 dark:border-sky-500/30">
            <Sparkles className="w-3 h-3" />
            <span>KaamSetu AI</span>
          </div>
          <h2 className="text-[26px] sm:text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
            Create an Account
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-white/75">
            {role === 'worker'
              ? 'Register with your mobile number to discover daily jobs & contracts'
              : 'Register your organization to post jobs & hire skilled workers'}
          </p>
        </div>

        {localError && (
          <div className="mb-5 flex items-center gap-2.5 p-3 rounded-[14px] bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* Role Selector with Frosted Glass Tabs */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('worker')}
                className={`py-3 px-4 rounded-[14px] flex items-center justify-center gap-2.5 text-sm font-bold transition-all duration-200 border cursor-pointer ${
                  role === 'worker'
                    ? 'bg-primary text-white border-primary/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(37,99,235,0.35)]'
                    : 'bg-white/60 dark:bg-white/8 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/15 hover:bg-white/90 dark:hover:bg-white/15'
                }`}
              >
                <User className="w-4.5 h-4.5" />
                <span>Worker (कामगार)</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('employer')}
                className={`py-3 px-4 rounded-[14px] flex items-center justify-center gap-2.5 text-sm font-bold transition-all duration-200 border cursor-pointer ${
                  role === 'employer'
                    ? 'bg-primary text-white border-primary/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(37,99,235,0.35)]'
                    : 'bg-white/60 dark:bg-white/8 text-slate-700 dark:text-white/70 border-slate-200/80 dark:border-white/15 hover:bg-white/90 dark:hover:bg-white/15'
                }`}
              >
                <Briefcase className="w-4.5 h-4.5" />
                <span>Employer (नियोक्ता)</span>
              </button>
            </div>
          </div>

          {/* Full Name with 50-character limit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                {role === 'worker' ? 'Full Name *' : 'Contact Person / Organization Name *'}
              </label>
              <span className="text-[11px] text-slate-500 dark:text-white/60 font-semibold">
                {name.length}/50
              </span>
            </div>
            <div className="relative">
              <User className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
              <input
                type="text"
                required
                maxLength={50}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder={role === 'worker' ? 'Enter full name' : 'Enter organization or contact name'}
                className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] sm:text-[15px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* Indian Mobile Number with Non-Removable +91 Prefix */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                Indian Mobile Number *
              </label>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                10 Digits Required
              </span>
            </div>
            <div className="relative flex items-center rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 backdrop-blur-[8px] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-white/15 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all duration-200 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              {/* Permanent, Non-Removable +91 Badge */}
              <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3 text-[14px] sm:text-[15px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-white/5 border-r border-slate-200/80 dark:border-white/10 select-none flex-shrink-0">
                <span className="text-base leading-none">🇮🇳</span>
                <span className="tracking-tight text-slate-900 dark:text-white font-black">+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit mobile number"
                className="w-full bg-transparent px-3.5 py-3 text-[14px] sm:text-[15px] text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-white/45 tracking-wider font-semibold"
              />
              {phone.length === 10 && (
                <div className="pr-3 text-emerald-500 flex-shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/60 mt-1">
              Indian mobile number used for sign-in and direct verification.
            </p>
          </div>

          {/* Email Address — Role-Based Optional vs Mandatory (Starts completely blank with no browser autofill) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                Email Address {role === 'employer' ? '*' : ''}
              </label>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  role === 'employer'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300'
                }`}
              >
                {role === 'employer' ? 'Required for Employers' : 'Optional for Workers'}
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
              <input
                type="email"
                required={role === 'employer'}
                autoComplete="off"
                name="reg_email_field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'employer' ? 'Enter email address' : 'Optional (leave blank if you do not have email)'}
                className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/60 mt-1">
              {role === 'employer'
                ? 'Mandatory for billing invoices, candidate notifications & hiring agreements.'
                : 'Workers can sign in using only their mobile number and password.'}
            </p>
          </div>

          {/* Password & Confirm Password Grid (With autoComplete="new-password" to ensure strictly blank start) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                Password * (min 8)
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  name="reg_new_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  name="reg_confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
              Preferred Language
            </label>
            <div className="relative">
              <Globe className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={role === 'employer'}
                className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="en" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">English (EN)</option>
                {role === 'worker' && (
                  <>
                    <option value="mr" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">मराठी (Marathi)</option>
                    <option value="hi" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">हिंदी (Hindi)</option>
                  </>
                )}
              </select>
            </div>
            {role === 'employer' && (
              <p className="text-[11px] text-slate-500 dark:text-white/60 mt-1">Employer accounts are restricted to English only.</p>
            )}
          </div>

          {/* Liquid Glass Shimmer Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full cursor-pointer overflow-hidden rounded-[14px] border border-indigo-400/50 bg-gradient-to-r from-indigo-600 via-primary to-blue-600 py-3.5 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_14px_30px_-16px_rgba(37,99,235,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-indigo-400 after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:[background:linear-gradient(105deg,transparent,rgba(255,255,255,0.5),transparent)] after:[transform:translateX(-200%)_skewX(-14deg)] after:transition-transform after:duration-700 group-hover:after:[transform:translateX(320%)_skewX(-14deg)] group-focus-visible:after:[transform:translateX(320%)_skewX(-14deg)] motion-reduce:transition-none motion-reduce:after:hidden mt-2"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-slate-600 dark:text-white/75">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-primary dark:text-sky-300 hover:underline ml-1"
          >
            Sign In with Mobile or Email
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
