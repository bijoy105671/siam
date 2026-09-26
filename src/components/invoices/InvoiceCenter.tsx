import React, { useMemo, useState } from 'react';
import { FileText, Search, Eye, Printer, CalendarDays, CircleDollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface InvoiceCenterProps { onSelectTransaction: (tx: Transaction) => void; }

export const InvoiceCenter: React.FC<InvoiceCenterProps> = ({ onSelectTransaction }) => {
  const { transactions, settings } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const invoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return transactions
      .filter(tx => status === 'ALL' || tx.status === status)
      .filter(tx => period === 'ALL' || (period === 'TODAY' ? tx.date === today : period === 'MONTH' ? tx.date >= monthStart && tx.date <= today : tx.date >= yearStart && tx.date <= today))
      .filter(tx => !q || [tx.invoiceNumber, tx.customerName, tx.customerMobile, tx.serviceName, tx.flightDetails?.pnr, tx.flightDetails?.ticketNumber].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  }, [transactions, query, status]);
  const total = invoices.reduce((s, tx) => s + tx.sellingPrice, 0);
  const due = invoices.reduce((s, tx) => s + tx.customerDue, 0);
  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" />Invoice Center</h1><p className="text-xs text-slate-500 mt-1">{settings.name} · Search, review and print customer invoices</p></div><div className="flex gap-2 text-xs"><div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">Invoices <strong className="ml-2 text-blue-700">{invoices.length}</strong></div><div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">Due <strong className="ml-2 text-amber-700">{formatCurrency(due)}</strong></div></div></div>
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoice, customer, mobile, PNR or ticket number..." className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" /></div><select value={period} onChange={e => setPeriod(e.target.value)} className="sm:w-36 px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white"><option value="ALL">All Dates</option><option value="TODAY">Today</option><option value="MONTH">This Month</option><option value="YEAR">This Year</option></select><select value={status} onChange={e => setStatus(e.target.value)} className="sm:w-40 px-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white"><option value="ALL">All Status</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="DUE">Due</option><option value="REFUND">Refund</option><option value="CANCELLED">Cancelled</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><span className="text-sm font-semibold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />Invoice Records</span><div className="flex items-center gap-3 text-[11px]"><span className="text-slate-500">Total: <b className="text-slate-800">{formatCurrency(total)}</b></span><span className="text-amber-700">Outstanding: <b>{formatCurrency(due)}</b></span></div></div>{invoices.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No invoice found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="text-left px-4 py-3">Invoice</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Service</th><th className="text-left px-4 py-3">Date</th><th className="text-right px-4 py-3">Amount</th><th className="text-right px-4 py-3">Due</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.map(tx => <tr key={tx.id} className="hover:bg-slate-50/70"><td className="px-4 py-3 font-mono font-semibold text-blue-700">{tx.invoiceNumber}</td><td className="px-4 py-3"><div className="font-semibold text-slate-800">{tx.customerName}</div><div className="text-[10px] text-slate-400">{tx.customerMobile}</div></td><td className="px-4 py-3 text-slate-600">{tx.serviceName}</td><td className="px-4 py-3 text-slate-500">{formatDate(tx.date)}</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(tx.sellingPrice)}</td><td className="px-4 py-3 text-right font-mono font-semibold text-amber-700">{formatCurrency(tx.customerDue)}</td><td className="px-4 py-3 text-center"><span className="inline-flex px-2 py-1 rounded-md text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200">{tx.status}</span></td><td className="px-4 py-3 text-right"><button onClick={() => onSelectTransaction(tx)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold cursor-pointer"><Eye className="w-3.5 h-3.5" />View / Print</button></td></tr>)}</tbody></table></div>}</div>
    <div className="text-[10px] text-slate-400 flex items-center gap-1"><CircleDollarSign className="w-3 h-3" />Paid: {formatCurrency(total - due)} · Outstanding: {formatCurrency(due)} <span className="ml-1">·</span> <Printer className="w-3 h-3" /> Existing invoice template + QR verification remain unchanged.</div>
  </div>;
};
