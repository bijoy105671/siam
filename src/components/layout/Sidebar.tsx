import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  Plane,
  Users,
  Briefcase,
  WalletCards,
  HandCoins,
  ArrowLeftRight,
  BellRing,
  BarChart3,
  ShieldAlert,
  History,
  Database,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { todayReminders, overdueReminders, upcomingFlights } = useApp();

  const totalDuesAlert = todayReminders.length + overdueReminders.length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'new_entry',
      label: 'One Entry (New)',
      icon: PlusCircle,
      highlight: true,
      badge: null,
    },
    {
      id: 'transactions',
      label: 'All Transactions',
      icon: ReceiptText,
      badge: null,
    },
    {
      id: 'flights',
      label: 'Flight Calendar',
      icon: Plane,
      badge: upcomingFlights.length > 0 ? `${upcomingFlights.length} 30D` : null,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'customers',
      label: 'Customers & Ledger',
      icon: Users,
      badge: null,
    },
    {
      id: 'vendors',
      label: 'Vendors & Ledger',
      icon: Briefcase,
      badge: null,
    },
    {
      id: 'expenses',
      label: 'Expense Manager',
      icon: WalletCards,
      badge: null,
    },
    {
      id: 'loans',
      label: 'Loan & Advance',
      icon: HandCoins,
      badge: null,
    },
    {
      id: 'transfers',
      label: 'Fund Transfers',
      icon: ArrowLeftRight,
      badge: null,
    },
    {
      id: 'reminders',
      label: 'Payment Reminders',
      icon: BellRing,
      badge: totalDuesAlert > 0 ? `${totalDuesAlert} Due` : null,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'reports',
      label: 'Profit/Loss & Reports',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'admin',
      label: 'Admin Control Panel',
      icon: ShieldAlert,
      badge: null,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      badge: null,
    },
    {
      id: 'backup',
      label: 'Automated Backup',
      icon: Database,
      badge: 'AES-256',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'verify_portal',
      label: 'Verify Invoice',
      icon: ShieldCheck,
      badge: 'QR / Seal',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0 no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <span className="font-bold text-sm text-slate-800">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close Sidebar"
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Operational Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : item.highlight
                    ? 'text-blue-600 hover:bg-blue-50/60'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-blue-600'
                        : item.highlight
                        ? 'text-blue-500'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Agency Footer Stamp */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="text-[11px] font-semibold text-slate-800">SIAM AIR & DIGITAL</div>
          <div className="text-[10px] text-slate-500">Dhaka & Noakhali, Bangladesh</div>
          <div className="text-[9px] font-mono text-emerald-600 mt-1">One Entry Engine Active</div>
        </div>
      </aside>
    </>
  );
};
