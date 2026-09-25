import React, { useState } from 'react';
import { Shield, Key, User, X, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, users, currentUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      onClose();
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  const handleQuickSwitch = (uName: string, pass: string) => {
    login(uName, pass);
    onClose();
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
            Sign In to System
          </button>

          {/* Quick Demo Switcher */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2">
              Quick One-Click Sign In:
            </div>
            <div className="space-y-1.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
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
        </form>
      </div>
    </div>
  );
};
