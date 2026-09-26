import React, { useEffect, useState } from 'react';
import { Shield, KeyRound, UserRound, X, Eye, EyeOff, Mail, LockKeyhole, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, USE_SERVER_API } from '../../services/apiClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginAsync, users } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [businessIdentity, setBusinessIdentity] = useState({
    name: 'SIAM AIR & DIGITAL SERVICE',
    tagline: 'Travel Agency · Visa · Passport · Digital',
    logoUrl: '',
  });

  useEffect(() => {
    if (!isOpen || !USE_SERVER_API) return;
    let cancelled = false;
    api.publicSettings()
      .then(({ settings }) => {
        if (!cancelled) setBusinessIdentity(prev => ({ ...prev, ...settings }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const success = await loginAsync(username.trim(), password);
      if (success) onClose();
      else setError('Invalid username or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = async (uName: string, pass: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      const success = await loginAsync(uName, pass);
      if (success) onClose();
      else setError('Server authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestResetOtp = async () => {
    setError('');
    if (!resetUsername.trim()) {
      setError('Please enter your Admin username.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { api } = await import('../../services/apiClient');
      await api.requestPasswordReset(resetUsername.trim());
      setResetStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyReset = async () => {
    setError('');
    if (resetPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { api } = await import('../../services/apiClient');
      await api.verifyPasswordReset(resetUsername.trim(), resetOtp, resetPassword);
      setShowForgot(false);
      setResetStep('request');
      setResetOtp('');
      setResetPassword('');
      setResetConfirm('');
      alert('Admin password reset successfully. Please sign in with your new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600 px-7 pb-8 pt-7 text-white">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-sky-300/10" />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                {businessIdentity.logoUrl ? <img src={businessIdentity.logoUrl} alt={businessIdentity.name} className="h-full w-full object-contain p-1" /> : <Shield className="h-6 w-6" />}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close login"
                className="rounded-xl p-2 text-white/75 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">{businessIdentity.name}</div>
            <p className="mt-1 text-xs font-semibold text-white/70">{businessIdentity.tagline}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Welcome Back</h2>
            <p className="mt-1 text-sm text-white/80">Sign in securely to manage your business.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-7">
          {error && !showForgot && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">User ID / Username</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                placeholder="Enter your username"
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {USE_SERVER_API && (
            <div className="flex justify-end">
              <button type="button" onClick={() => { setShowForgot(true); setError(''); setResetStep('request'); setResetUsername(username); }} className="text-xs font-bold text-sky-600 transition hover:text-sky-700 hover:underline">
                Forgot Admin Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {isSubmitting ? 'Signing In…' : 'Sign In Securely'}
          </button>

          <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            Secure business access
          </div>

          {!USE_SERVER_API && users.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Demo Sign In</div>
              <div className="space-y-2">
                {users.map((u) => (
                  <button key={u.id} type="button" disabled={isSubmitting} onClick={() => handleQuickSwitch(u.username, u.password || 'admin123')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                    <div>
                      <span className="text-sm font-bold text-slate-800">{u.fullName}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-500">({u.username})</span>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-extrabold uppercase text-slate-500">{u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {showForgot && USE_SERVER_API && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.4)]">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Account Recovery</div>
                    <h3 className="mt-1 text-xl font-extrabold">Admin Password Reset</h3>
                  </div>
                  <button type="button" onClick={() => { setShowForgot(false); setError(''); }} className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                {resetStep === 'request' ? (
                  <>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex gap-3">
                        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                        <p className="text-xs leading-5 text-slate-600">
                          Enter your Admin username. A 6-digit OTP will be sent to <b className="text-slate-800">bijoy105671@gmail.com</b>.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-700">Admin Username</label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={resetUsername} onChange={e => setResetUsername(e.target.value)} placeholder="Enter Admin username" autoComplete="username" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10" />
                      </div>
                    </div>
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div>}
                    <button type="button" onClick={requestResetOtp} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-sky-600/15 disabled:opacity-60">
                      <Mail className="h-4 w-4" />
                      {isSubmitting ? 'Sending OTP…' : 'Send OTP to Email'}
                    </button>
                    <button type="button" onClick={() => setShowForgot(false)} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700">Back to Sign In</button>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-xs leading-5 text-emerald-800">OTP sent to <b>bijoy105671@gmail.com</b>. It expires in 10 minutes.</p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-700">Verification OTP</label>
                      <input value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.65em] outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="relative">
                        <input type={showResetPassword ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} minLength={8} autoComplete="new-password" placeholder="New password (8+)" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-11 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                        <button type="button" onClick={() => setShowResetPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400">{showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                      <div className="relative">
                        <input type={showResetConfirm ? 'text' : 'password'} value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} minLength={8} autoComplete="new-password" placeholder="Confirm password" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-11 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                        <button type="button" onClick={() => setShowResetConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400">{showResetConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div>}
                    <button type="button" onClick={verifyReset} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">
                      <CheckCircle2 className="h-4 w-4" />
                      {isSubmitting ? 'Resetting Password…' : 'Verify OTP & Reset Password'}
                    </button>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => { setResetStep('request'); setResetOtp(''); setError(''); }} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <button type="button" onClick={() => { setResetStep('request'); setResetOtp(''); setError(''); }} className="text-xs font-semibold text-sky-600 hover:underline">Resend OTP</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
