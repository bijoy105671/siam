import React, { useState } from 'react';
import {
  Menu,
  PlusCircle,
  Search,
  Shield,
  User as UserIcon,
  LogOut,
  Bell,
  Plane,
  Trash2,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavbarProps {
  onOpenNewEntry: () => void;
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  onOpenLogin: () => void;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewEntry,
  onOpenSearch,
  onToggleSidebar,
  onOpenLogin,
  onNavigate,
}) => {
  const { currentUser, logout, settings, todayReminders, overdueReminders, clearAllInputData, loadDemoSampleData } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleClearAll = () => {
    clearAllInputData();
    setShowClearConfirm(false);
    setNotification('All input data has been cleared! System is ready for fresh entries.');
    setTimeout(() => setNotification(null), 4000);
  };

  const totalAlerts = todayReminders.length + overdueReminders.length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between no-print">
      {/* Left: Mobile Toggle & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <img
            src={settings.logoUrl}
            alt="Siam Air"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg object-contain border border-slate-200 shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="font-bold text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
              {settings.name}
            </div>
            <div className="hidden sm:block text-[11px] text-slate-500 font-medium tracking-wide uppercase">
              Travel Agency · Visa · Passport · Digital
            </div>
          </div>
        </button>
      </div>

      {/* Middle: Quick Search Trigger */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            <span className="text-slate-500">Search customer, vendor, PNR, ticket, mobile...</span>
          </div>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Due Reminders Indicator */}
        <button
          onClick={() => onNavigate('reminders')}
          className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title={`${totalAlerts} Due Reminders pending`}
        >
          <Bell className="w-5 h-5" />
          {totalAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
              {totalAlerts}
            </span>
          )}
        </button>

        {/* Primary Action: ONE ENTRY */}
        <button
          onClick={onOpenNewEntry}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Entry</span>
        </button>

        {/* User Account / Role Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {currentUser ? currentUser.fullName.charAt(0) : 'A'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.fullName}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                {currentUser?.role}
              </div>
            </div>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="font-semibold text-slate-900">{currentUser?.fullName}</div>
                <div className="text-slate-500 text-[11px]">{currentUser?.phone || currentUser?.username}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-blue-600 font-semibold uppercase">
                  <Shield className="w-3 h-3" />
                  Role: {currentUser?.role}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onNavigate('admin');
                }}
                className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Admin & System Settings</span>
              </button>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenLogin();
                }}
                className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>Switch / Manage Accounts</span>
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  setShowClearConfirm(true);
                }}
                className="w-full text-left px-3.5 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-600" />
                <span>Clear All Input Data</span>
              </button>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs animate-bounce">
          <Trash2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Clear All Input Data Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Clear All Input Data?</h3>
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently wipe all entered input records from the system:
            </p>

            <ul className="text-xs space-y-1.5 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>All Invoices & Transactions (Air ticket, visa, digital)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>All Customer profiles, dues & payment ledgers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>All Vendor profiles, payables & payment ledgers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>All Expenses, Fund Transfers & Opening balances (৳0)</span>
              </li>
            </ul>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800">
              <strong>Safe:</strong> Your business settings, logo, invoice templates, service categories, and admin login credentials will NOT be touched.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
