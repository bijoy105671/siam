import React from 'react';
import { ArrowLeftRight, Landmark, Smartphone, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AccountBalancesCardProps {
  onOpenTransfer: () => void;
}

export const AccountBalancesCard: React.FC<AccountBalancesCardProps> = ({ onOpenTransfer }) => {
  const { accountBalances, totalAvailableMoney } = useApp();

  const accounts: { name: PaymentMethod; label: string; icon: any; color: string }[] = [
    { name: 'Cash', label: 'Cash (Drawer)', icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'bKash', label: 'bKash (Merchant/Agent)', icon: Smartphone, color: 'text-pink-600 bg-pink-50' },
    { name: 'Nagad', label: 'Nagad (Account)', icon: Smartphone, color: 'text-orange-600 bg-orange-50' },
    { name: 'Rocket', label: 'Rocket (DBBL)', icon: Smartphone, color: 'text-purple-600 bg-purple-50' },
    { name: 'Bank', label: 'Bank (City/Islami)', icon: Landmark, color: 'text-blue-600 bg-blue-50' },
    { name: 'Card', label: 'Card / Other', icon: Wallet, color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Liquid Liquidity & Bank Balances
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">
            {formatCurrency(totalAvailableMoney)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Actual available money (Receivables & Payables kept strictly separate)
          </div>
        </div>

        <button
          onClick={onOpenTransfer}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Internal Transfer</span>
        </button>
      </div>

      {/* Grid of actual accounts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
        {accounts.map((acc) => {
          const Icon = acc.icon;
          const balance = accountBalances[acc.name] || 0;
          return (
            <div
              key={acc.name}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`p-1.5 rounded-md ${acc.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate">{acc.name}</span>
              </div>
              <div
                className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                  balance < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {formatCurrency(balance)}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{acc.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
