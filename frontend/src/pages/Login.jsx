import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error: authError, setError: setAuthError } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    return () => {
      if (setAuthError) setAuthError(null);
    };
  }, [setAuthError]);

  const displayError = localError || authError;

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

    if (!email || !password) {
      setLocalError('Please enter both email/phone and password');
      return;
    }

    setIsSubmitting(true);
    const result = await login({ email, password });
    setIsSubmitting(false);

    if (result.success && result.user) {
      navigate(`/${result.user.role}`);
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Sign In</h2>
        <p className="text-sm text-slate-600">Access your KaamSetu AI account</p>
      </div>

      {displayError && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Email or Phone
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={email}
              onChange={handleEmailChange}
              placeholder="rahul@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
        >
          {isSubmitting ? (
            <span>Signing In...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-bold hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
};
