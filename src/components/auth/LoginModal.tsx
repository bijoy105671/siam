import React, { useState } from 'react';
import { Shield, Key, User, X, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { USE_SERVER_API } from '../../services/apiClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginAsync, users, currentUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const success = await loginAsync(username, password);
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


  const requestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsSubmitting(true);
    try {
      const { api } = await import('../../services/apiClient');
      await api.requestPasswordReset(resetUsername);
      setResetStep('verify');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send OTP.'); }
    finally { setIsSubmitting(false); }
  };

  const verifyReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (resetPassword !== resetConfirm) { setError('New password and confirmation do not match.'); return; }
    setIsSubmitting(true);
    try {
      const { api } = await import('../../services/apiClient');
      await api.verifyPasswordReset(resetUsername, resetOtp, resetPassword);
      setShowForgot(false); setResetStep('request'); setResetOtp(''); setResetPassword(''); setResetConfirm('');
      alert('Admin password reset successfully. Please sign in with your new password.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Invalid or expired OTP.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Security Authentication</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {USE_SERVER_API && (
          <button type="button" onClick={() => { setShowForgot(true); setError(''); setResetStep('request'); }} className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700">
            Forgot Admin Password?
          </button>
        )}
        {showForgot && USE_SERVER_API && (
          <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-sm">Admin Password Recovery</span>
                <button type="button" onClick={() => { setShowForgot(false); setError(''); }}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                {resetStep === 'request' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">Enter your Admin username. The 6-digit OTP will be sent to <b>bijoy105671@gmail.com</b>.</p>
                    <input value={resetUsername} onChange={e => setResetUsername(e.target.value)} placeholder="Admin username" required autoComplete="username" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg" />
                    {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">{isSubmitting ? 'Sending OTP...' : 'Send OTP to Email'}</button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">OTP sent to <b>bijoy105671@gmail.com</b>. It expires in 10 minutes.</div>
                    <input value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" maxLength={6} required autoComplete="one-time-code" placeholder="6-digit OTP" className="w-full px-3 py-3 text-lg border border-slate-300 rounded-lg text-center tracking-[0.5em] font-bold" />
                    <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="New password (8+ characters)" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg" />
                    <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Confirm new password" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg" />
                    {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
                    <button type="submit" disabled={isSubmitting} className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">{isSubmitting ? 'Resetting Password...' : 'Verify OTP & Reset Password'}</button>
                    <button type="button" onClick={() => { setResetStep('request'); setResetOtp(''); setError(''); }} className="w-full text-xs text-slate-500">Resend OTP / Use another username</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="p-5 space-y-4">
        


          <div className="text-center pb-2">
            <div className="text-xs text-slate-500">Currently Authenticated As:</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {currentUser?.fullName} ({currentUser?.role.toUpperCase()})
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              User ID / Username
            </label>
            <input
              type="text"
              required
              value={username}
              placeholder="e.g. admin or staff1"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In to System'}
          </button>

          {!USE_SERVER_API && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2">
                Quick Demo Sign In (local mode only)
              </div>
              <div className="space-y-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickSwitch(u.username, u.password || 'admin123')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-xs border border-slate-200 text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{u.fullName}</span>
                      <span className="text-[11px] text-slate-500 font-mono ml-2">({u.username})</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 uppercase font-semibold">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
