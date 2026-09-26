import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building,
  PlusCircle,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Users as UsersIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getTransactionStatusColor } from '../../utils/formatters';
import { AccountBalancesCard } from './AccountBalancesCard';
import { UpcomingFlightsCard } from './UpcomingFlightsCard';
import { TodayRemindersCard } from './TodayRemindersCard';
import { Transaction } from '../../types';

interface DashboardProps {
  onOpenNewEntry: () => void;
  onOpenCustomerDue: () => void;
  onOpenVendorDue: () => void;
  onOpenCustomerProfiles: () => void;
  onOpenVendorProfiles: () => void;
  onOpenTransfer: () => void;
  onOpenExpense: () => void;
  onViewAllTransactions: () => void;
  onViewAllFlights: () => void;
  onViewAllReminders: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewEntry,
  onOpenCustomerDue,
  onOpenVendorDue,
  onOpenCustomerProfiles,
  onOpenVendorProfiles,
  onOpenTransfer,
  onOpenExpense,
  onViewAllTransactions,
  onViewAllFlights,
  onViewAllReminders,
  onSelectTransaction,
  onOpenPayment,
}) => {
  const {
    todaySummary,
    totalCustomerReceivable,
    totalVendorPayable,
    transactions,
    settings,
  } = useApp();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {settings.name || 'Agency Command Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {settings.tagline || 'Real-time sales, vendor settlements, liquid money & flight dispatch'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>One Entry</span>
          </button>
          <button
            onClick={onOpenCustomerDue}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Customer Due / Partial</span>
          </button>
          <button
            onClick={onOpenVendorDue}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Vendor Due / Partial</span>
          </button>
          <button
            onClick={onOpenCustomerProfiles}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>Customer Profile</span>
          </button>
          <button
            onClick={onOpenVendorProfiles}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Vendor Profile</span>
          </button>
          <button
            onClick={onOpenExpense}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Fund Transfer</span>
          </button>
        </div>
      </div>

      {/* TODAY'S METRICS & OUTSTANDING LEDGER DUES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {/* Today's Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Today's Sales</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 tabular-nums">
            {formatCurrency(todaySummary.totalSales)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total turnover booked today</div>
        </div>

        {/* Today's Received */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Today's Received</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 tabular-nums">
            {formatCurrency(todaySummary.totalReceived)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cash/bKash/Bank deposits in</div>
        </div>

        {/* Today's Gross Profit */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Gross Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatCurrency(todaySummary.grossProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Selling price - Vendor cost</div>
        </div>

        {/* Today's Expense */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Today's Expense</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 tabular-nums">
            {formatCurrency(todaySummary.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Office rent, bills & boosts</div>
        </div>

        {/* Today's Net Profit */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Today's Net Profit</span>
            {todaySummary.netProfit >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              todaySummary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(todaySummary.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {todaySummary.loss > 0 ? `Loss: ${formatCurrency(todaySummary.loss)} · ` : ''}
            Gross - Applicable expenses
          </div>
        </div>
      </div>

      {/* RECEIVABLE & PAYABLE DUES BANNER (Strictly separate from cash) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Receivable */}
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-lg bg-rose-100 text-rose-700">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-rose-900 uppercase tracking-wide">
                Customer Receivable (Total Due)
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 mt-0.5 tabular-nums">
                {formatCurrency(totalCustomerReceivable)}
              </div>
              <div className="text-[11px] text-rose-700/80">
                Outstanding money owed by customers (Not included in liquid cash)
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Payable */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                Vendor Payable (Total Due)
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800 mt-0.5 tabular-nums">
                {formatCurrency(totalVendorPayable)}
              </div>
              <div className="text-[11px] text-amber-800/80">
                Airlines & Consolidator liability (Not deducted until paid)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTUAL MONEY BALANCES */}
      <AccountBalancesCard onOpenTransfer={onOpenTransfer} />

      {/* FLIGHT CALENDAR (NEXT 30 DAYS) & REMINDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingFlightsCard
          onViewAllFlights={onViewAllFlights}
          onSelectFlight={onSelectTransaction}
        />
        <TodayRemindersCard
          onViewAllReminders={onViewAllReminders}
          onOpenPayment={onOpenPayment}
        />
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Latest invoices and service entries</p>
          </div>

          <button
            onClick={onViewAllTransactions}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            View All ({transactions.length})
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Date/Invoice</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Service / Route</th>
                <th className="py-2.5 px-3 text-right">Sale Price</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-500">No transactions recorded yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &apos;New Entry&apos; to create your first invoice or booking.</p>
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 5).map((tx) => {
                const statusStyle = getTransactionStatusColor(tx.status);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 font-mono">{tx.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{formatDate(tx.date)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{tx.customerName}</div>
                      <div className="text-[11px] text-slate-500">{tx.customerMobile}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{tx.serviceName}</div>
                      {tx.flightDetails && (
                        <div className="text-[11px] font-mono text-blue-600">
                          {tx.flightDetails.route} · PNR: {tx.flightDetails.pnr}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(tx.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 tabular-nums">
                      {formatCurrency(tx.customerPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                      {tx.customerDue > 0 ? (
                        <span className="text-rose-600">{formatCurrency(tx.customerDue)}</span>
                      ) : (
                        <span className="text-slate-400">৳0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Invoice / View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
