import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, CreditCard, Building, PlusCircle, DollarSign,
  AlertCircle, ReceiptText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getTransactionStatusColor } from '../../utils/formatters';
import { AccountBalancesCard } from './AccountBalancesCard';
import { UpcomingFlightsCard } from './UpcomingFlightsCard';
import { TodayRemindersCard } from './TodayRemindersCard';
import { Transaction } from '../../types';

interface Props {
  onOpenNewEntry: () => void;
  onOpenCustomerDue: () => void;
  onOpenVendorDue: () => void;
  onOpenTransfer: () => void;
  onOpenExpense: () => void;
  onViewAllTransactions: () => void;
  onViewAllFlights: () => void;
  onViewAllReminders: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}
type CalcMode = 'net' | 'reissue' | 'refund';

const num = (v: string) => Number.parseFloat(v) || 0;
const money = (v: number) => `৳ ${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const Dashboard: React.FC<Props> = (props) => {
  const {
    todaySummary, totalCustomerReceivable, totalVendorPayable, transactions, settings
  } = useApp();
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [mode, setMode] = useState<CalcMode>('net');
  const [values, setValues] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setValues((p) => ({ ...p, [key]: value }));
  const v = (key: string) => values[key] || '';
  const clear = () => setValues({});

  let result = 0;
  let resultLabel = 'NET FARE';
  if (mode === 'net') {
    const gross = num(v('gross')); const base = num(v('base'));
    result = gross - base * 0.07 + gross * 0.003;
  } else if (mode === 'reissue') {
    const inside = (num(v('newBase')) - num(v('oldBase'))) + (num(v('newTax')) - num(v('oldTax'))) + num(v('penalty'));
    result = inside + inside * 0.003; resultLabel = 'REISSUE CHARGE';
  } else {
    const net = num(v('net')); const penalty = num(v('refundPenalty')); const other = num(v('otherTax'));
    result = net - penalty - other - net * 0.003; resultLabel = 'FULL REFUND';
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">SIAM AIR CONTROL CENTER</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate">{settings.name || 'SIAM AIR AND DIGITAL SERVICE'}</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">{settings.tagline || 'All service in one doors'}</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <ActionButton icon={<PlusCircle className="w-4 h-4"/>} label="One Entry" onClick={props.onOpenNewEntry} primary />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric title="Today’s Sales" value={formatCurrency(todaySummary.totalSales)} icon={<DollarSign className="w-4 h-4"/>} />
        <Metric title="Today’s Received" value={formatCurrency(todaySummary.totalReceived)} icon={<ArrowDownLeft className="w-4 h-4"/>} valueClass="text-emerald-600" />
        <Metric title="Gross Profit" value={formatCurrency(todaySummary.grossProfit)} icon={<TrendingUp className="w-4 h-4"/>} valueClass="text-emerald-700" />
        <Metric title="Today’s Expense" value={formatCurrency(todaySummary.totalExpense)} icon={<ArrowUpRight className="w-4 h-4"/>} valueClass="text-rose-600" />
        <Metric title="Net Profit" value={formatCurrency(todaySummary.netProfit)} icon={todaySummary.netProfit >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>} valueClass={todaySummary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} wide />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={props.onOpenCustomerDue} className="text-left rounded-2xl border border-rose-200 bg-rose-50/70 p-4 hover:bg-rose-50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><ArrowDownLeft className="w-5 h-5"/></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Customer Receivable</p><p className="text-xl sm:text-2xl font-extrabold font-mono text-rose-700 mt-0.5">{formatCurrency(totalCustomerReceivable)}</p><p className="text-[11px] text-rose-700/70">Due / partial payment</p></div></div>
        </button>
        <button onClick={props.onOpenVendorDue} className="text-left rounded-2xl border border-amber-200 bg-amber-50/70 p-4 hover:bg-amber-50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><Building className="w-5 h-5"/></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Vendor Payable</p><p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-800 mt-0.5">{formatCurrency(totalVendorPayable)}</p><p className="text-[11px] text-amber-800/70">Due / partial settlement</p></div></div>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <ActionButton icon={<ArrowDownLeft className="w-4 h-4"/>} label="Customer Due" onClick={props.onOpenCustomerDue} />
        <ActionButton icon={<Building className="w-4 h-4"/>} label="Vendor Due" onClick={props.onOpenVendorDue} />
        <ActionButton icon={<CreditCard className="w-4 h-4"/>} label="Record Expense" onClick={props.onOpenExpense} />
        <ActionButton icon={<ArrowUpRight className="w-4 h-4"/>} label="Fund Transfer" onClick={props.onOpenTransfer} />
      </div>

      <AccountBalancesCard onOpenTransfer={props.onOpenTransfer} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingFlightsCard onViewAllFlights={props.onViewAllFlights} onSelectFlight={props.onSelectTransaction} />
        <TodayRemindersCard onViewAllReminders={props.onViewAllReminders} onOpenPayment={props.onOpenPayment} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div><h2 className="text-sm font-extrabold text-slate-900">Recent Transactions</h2><p className="text-[11px] text-slate-500">Latest invoices and service entries</p></div>
          <button onClick={props.onViewAllTransactions} className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">View All ({transactions.length})</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
              <tr><th className="py-2.5 px-3">Date / Invoice</th><th className="py-2.5 px-3">Customer</th><th className="py-2.5 px-3">Service / Route</th><th className="py-2.5 px-3 text-right">Sale</th><th className="py-2.5 px-3 text-right">Paid</th><th className="py-2.5 px-3 text-right">Due</th><th className="py-2.5 px-3 text-center">Status</th><th className="py-2.5 px-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center"><ReceiptText className="w-7 h-7 mx-auto text-slate-300"/><p className="mt-2 font-semibold text-slate-500">No transactions recorded yet.</p><p className="text-[11px] text-slate-400 mt-0.5">Use One Entry to create the first invoice.</p></td></tr>
              ) : transactions.slice(0, 5).map((tx) => {
                const statusStyle = getTransactionStatusColor(tx.status);
                return <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3"><div className="font-bold font-mono text-slate-900">{tx.invoiceNumber}</div><div className="text-[10px] text-slate-500">{formatDate(tx.date)}</div></td>
                  <td className="py-3 px-3"><div className="font-semibold text-slate-900">{tx.customerName}</div><div className="text-[10px] text-slate-500">{tx.customerMobile}</div></td>
                  <td className="py-3 px-3"><div className="font-medium text-slate-800">{tx.serviceName}</div>{tx.flightDetails && <div className="text-[10px] font-mono text-blue-600">{tx.flightDetails.route} · PNR: {tx.flightDetails.pnr}</div>}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">{formatCurrency(tx.sellingPrice)}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">{formatCurrency(tx.customerPaid)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">{tx.customerDue > 0 ? <span className="text-rose-600">{formatCurrency(tx.customerDue)}</span> : <span className="text-slate-400">৳0</span>}</td>
                  <td className="py-3 px-3 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>{tx.status}</span></td>
                  <td className="py-3 px-3 text-right"><button onClick={() => props.onSelectTransaction(tx)} className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">View</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean}> = ({icon,label,onClick,primary}) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
    {icon}<span>{label}</span>
  </button>
);

const Metric: React.FC<{title:string; value:string; icon:React.ReactNode; valueClass?:string; wide?:boolean}> = ({title,value,icon,valueClass='text-slate-900',wide}) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
    <div className="flex items-center justify-between gap-2"><span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{title}</span><span className={`shrink-0 ${valueClass}`}>{icon}</span></div>
    <div className={`mt-1 text-base sm:text-xl font-extrabold font-mono tabular-nums truncate ${valueClass}`}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span><input inputMode="decimal" type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></label>
);
