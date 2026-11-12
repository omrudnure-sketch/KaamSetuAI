import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { KaamSetuLogo } from '../components/KaamSetuLogo.jsx';
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles, CheckCircle2, Phone } from 'lucide-react';

export const Login = () => {
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login, error: authError, setError: setAuthError } = useAuth();
  const navigate = useNavigate();

  // Redirect already authenticated users to their portal to prevent back-looping into login
  React.useEffect(() => {
    if (user && user.role) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  React.useEffect(() => {
    return () => {
      if (setAuthError) setAuthError(null);
    };
  }, [setAuthError]);

  const displayError = localError || authError;

  // Strict number-only handler: limits to exactly 10 numeric digits
  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (localError) setLocalError('');
    if (authError && setAuthError) setAuthError(null);
  };

  // Block non-digit keystrokes before they reach the input
  const handlePhoneKeyDown = (e) => {
    // Allow navigation & editing keys
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
        'Home',
        'End',
      ].includes(e.key)
    ) {
      return;
    }

    // Allow keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Cmd+A, etc.)
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Block any non-digit character (only 0-9 allowed)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Sanitize clipboard paste to only allow numeric digits up to 10
  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || '';
    const digitsOnly = pasted.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (localError) setLocalError('');
    if (authError && setAuthError) setAuthError(null);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (localError) setLocalError('');
    if (authError && setAuthError) setAuthError(null);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (localError) setLocalError('');
    if (authError && setAuthError) setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (setAuthError) setAuthError(null);

    const identifier = loginMode === 'phone' ? phone.trim() : email.trim();

    if (!identifier) {
      setLocalError(
        loginMode === 'phone'
          ? 'Please enter your 10-digit mobile number'
          : 'Please enter your email address'
      );
      return;
    }

    if (loginMode === 'phone') {
      if (identifier.length !== 10) {
        setLocalError('Mobile number must be exactly 10 digits');
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        setLocalError('Please enter a valid email address');
        return;
      }
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const result = await login({ email: identifier, password });
    setIsSubmitting(false);

    if (result.success && result.user) {
      navigate(`/${result.user.role}`, { replace: true });
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-14rem)] flex items-center justify-center p-4 sm:p-6 my-auto">
      {/* Centered Liquid Glass Login Card with Smooth Motion */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[28px] border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/85 p-7 sm:p-9 text-slate-900 dark:text-white backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] animate-in fade-in slide-in-from-bottom-3 duration-400 ease-out">
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
            Welcome back
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-white/75">
            Sign in to your worker or employer workspace
          </p>
        </div>

        {displayError && (
          <div className="mb-5 flex items-center gap-2.5 p-3 rounded-[14px] bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* Mobile Number Login (Default, 10 Digits Only, Numeric Only) */}
          {loginMode === 'phone' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                  Indian Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
                      phone.length === 10
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black'
                        : 'text-slate-500 dark:text-white/60 bg-slate-100 dark:bg-white/10'
                    }`}
                  >
                    {phone.length}/10 Digits
                  </span>
                </div>
              </div>
              <div className="relative flex items-center rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 backdrop-blur-[8px] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-white/15 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all duration-200 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                {/* Permanent Non-Removable +91 Badge */}
                <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3 text-[14px] sm:text-[15px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-white/5 border-r border-slate-200/80 dark:border-white/10 select-none flex-shrink-0">
                  <span className="text-base leading-none">🇮🇳</span>
                  <span className="tracking-tight text-slate-900 dark:text-white font-black">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={10}
                  autoComplete="tel-national"
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={handlePhonePaste}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-transparent px-3.5 py-3 text-[14px] sm:text-[15px] text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-white/45 tracking-wider font-semibold"
                />
                {phone.length === 10 && (
                  <div className="pr-3 text-emerald-500 flex-shrink-0 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-white/60">
                  Only numbers (0-9) • Max 10 digits
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('email');
                    setLocalError('');
                  }}
                  className="text-primary dark:text-sky-300 font-semibold hover:underline cursor-pointer"
                >
                  Use email instead
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('phone');
                    setLocalError('');
                  }}
                  className="text-[11px] text-primary dark:text-sky-300 font-semibold hover:underline cursor-pointer"
                >
                  Use mobile number instead
                </button>
              </div>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                  className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] sm:text-[15px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
                />
              </div>
              <div className="mt-1.5 text-right text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('phone');
                    setLocalError('');
                  }}
                  className="text-primary dark:text-sky-300 font-semibold hover:underline cursor-pointer"
                >
                  ← Back to 10-digit mobile login
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.05em] text-slate-700 dark:text-white/75">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 pointer-events-none" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                className="w-full rounded-[14px] border border-slate-200/90 dark:border-white/20 bg-white/75 dark:bg-white/8 pl-10.5 pr-4 py-3 text-[14px] sm:text-[15px] text-slate-900 dark:text-white outline-none backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] placeholder:text-slate-400 dark:placeholder:text-white/45 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="pt-1 pb-1 flex items-center justify-between text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-white/80 select-none">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <Link
              to="/register"
              className="font-semibold text-primary dark:text-sky-300 hover:underline"
            >
              Need an account?
            </Link>
          </div>

          {/* Liquid Glass Shimmer Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full cursor-pointer overflow-hidden rounded-[14px] border border-indigo-400/50 bg-gradient-to-r from-indigo-600 via-primary to-blue-600 py-3.5 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_14px_30px_-16px_rgba(37,99,235,0.6)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-indigo-400 after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:[background:linear-gradient(105deg,transparent,rgba(255,255,255,0.5),transparent)] after:[transform:translateX(-200%)_skewX(-14deg)] after:transition-transform after:duration-700 group-hover:after:[transform:translateX(320%)_skewX(-14deg)] group-focus-visible:after:[transform:translateX(320%)_skewX(-14deg)] motion-reduce:transition-none motion-reduce:after:hidden"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-slate-600 dark:text-white/75">
          New to KaamSetu?{' '}
          <Link
            to="/register"
            className="font-bold text-primary dark:text-sky-300 hover:underline ml-1"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
