import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Phone, Lock, Globe, Briefcase, HardHat, AlertCircle, ArrowRight } from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'employer') {
      setPreferredLanguage('en');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!name || !password) {
      setLocalError('Name and Password (min 8 chars) are required');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name,
      email,
      phone,
      password,
      role,
      preferredLanguage: role === 'employer' ? 'en' : preferredLanguage,
    });
    setIsSubmitting(false);

    if (result.success && result.user) {
      navigate(`/${result.user.role}`);
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Create Account</h2>
        <p className="text-sm text-slate-600">Join KaamSetu AI as a Worker or Employer</p>
      </div>

      {localError && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            I am registering as:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleChange('worker')}
              className={`p-3 border rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                role === 'worker'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Worker</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('employer')}
              className={`p-3 border rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                role === 'employer'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span>Employer</span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahul Patil"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Password * (min 8 chars)
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Preferred Language */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Preferred Language
          </label>
          <div className="relative">
            <Globe className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              disabled={role === 'employer'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="en">English (EN)</option>
              {role === 'worker' && (
                <>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </>
              )}
            </select>
          </div>
          {role === 'employer' && (
            <p className="text-xs text-slate-600 mt-1">Employer accounts are restricted to English only.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
        >
          {isSubmitting ? (
            <span>Creating Account...</span>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};
