import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';

const VERIFICATION_STORAGE_KEY = 'siam_security_otp_verified_at';

const notifySecurityVerified = () => {
  const stamp = String(Date.now());
  try { localStorage.setItem(VERIFICATION_STORAGE_KEY, stamp); } catch {}
  window.dispatchEvent(new CustomEvent('siam:security-otp-verified'));
};

export const SecurityOtpModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setMessage(String(detail.message || 'A security OTP was sent to your recovery email.'));
      setOtp('');
      setError('');
      setSuccess(false);
      setOpen(true);
    };

    const onVerified = () => {
      setSuccess(true);
      setBusy(false);
      setTimeout(() => setOpen(false), 700);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === VERIFICATION_STORAGE_KEY && event.newValue) onVerified();
    };

    window.addEventListener('siam:security-otp-required', show);
    window.addEventListener('siam:security-otp-verified', onVerified);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('siam:security-otp-required', show);
      window.removeEventListener('siam:security-otp-verified', onVerified);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const verify = async () => {
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-security-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: cleanOtp }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Security OTP verification failed.');
      notifySecurityVerified();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Security OTP verification failed.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Security Verification</div>
              <div className="text-[11px] text-white/80">Admin confirmation required</div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {success ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
              <div className="mt-3 font-bold text-slate-900">OTP Verified</div>
              <div className="mt-1 text-xs text-slate-500">Continuing your admin action…</div>
            </div>
          ) : (
            <>
              <div className="text-xs leading-relaxed text-slate-600">
                {message}
                <div className="mt-2 font-semibold text-slate-800">Recovery email: bijoy105671@gmail.com</div>
                <div className="text-[11px] text-slate-400">The OTP is valid for 10 minutes.</div>
              </div>

              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter') void verify(); }}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 text-center text-xl tracking-[0.35em] font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {error && <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</div>}

              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} disabled={busy} className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                  Cancel
                </button>
                <button type="button" onClick={() => void verify()} disabled={busy || otp.length !== 6} className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
