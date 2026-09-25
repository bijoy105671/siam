import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  Download,
  Printer,
  Edit,
  Trash2,
  Eye,
  Plus,
  Plane,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Transaction, TransactionStatus } from '../../types';
import { formatCurrency, formatDate, formatTime, getTransactionStatusColor } from '../../utils/formatters';

interface TransactionListProps {
  onSelectTransaction: (tx: Transaction) => void;
  onOpenNewEntry: () => void;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onSelectTransaction,
  onOpenNewEntry,
  onOpenPayment,
}) => {
  const { transactions, services, deleteTransaction, currentUser } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filtering logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredTransactions = transactions.filter((tx) => {
    // 1. Text Search (Customer, Vendor, Invoice, PNR, Ticket, Service)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        tx.customerName.toLowerCase().includes(q) ||
        tx.customerMobile.includes(q) ||
        tx.invoiceNumber.toLowerCase().includes(q) ||
        tx.serviceName.toLowerCase().includes(q) ||
        (tx.vendorName && tx.vendorName.toLowerCase().includes(q)) ||
        (tx.flightDetails &&
          (tx.flightDetails.pnr.toLowerCase().includes(q) ||
            tx.flightDetails.ticketNumber.toLowerCase().includes(q) ||
            tx.flightDetails.passengerName.toLowerCase().includes(q) ||
            tx.flightDetails.route.toLowerCase().includes(q)));
      if (!match) return false;
    }

    // 2. Service filter
    if (serviceFilter !== 'all' && tx.serviceId !== serviceFilter) return false;

    // 3. Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

    // 4. Date filter
    if (dateRange === 'today') {
      if (tx.date !== todayStr) return false;
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      if (tx.date !== yStr) return false;
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sStr = sevenDaysAgo.toISOString().split('T')[0];
      if (tx.date < sStr) return false;
    } else if (dateRange === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      if (tx.date < firstOfMonth) return false;
    } else if (dateRange === 'custom') {
      if (customStart && tx.date < customStart) return false;
      if (customEnd && tx.date > customEnd) return false;
    }

    return true;
  });

  const totalSales = filteredTransactions.reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalPaid = filteredTransactions.reduce((sum, t) => sum + t.customerPaid, 0);
  const totalDue = filteredTransactions.reduce((sum, t) => sum + t.customerDue, 0);
  const totalProfit = filteredTransactions.reduce((sum, t) => sum + t.grossProfit, 0);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Invoice',
      'Date',
      'Customer',
      'Mobile',
      'Service',
      'PNR',
      'Route',
      'Selling Price',
      'Customer Paid',
      'Customer Due',
      'Vendor',
      'Vendor Cost',
      'Vendor Due',
      'Gross Profit',
      'Status',
    ];

    const rows = filteredTransactions.map((t) => [
      t.invoiceNumber,
      t.date,
      `"${t.customerName}"`,
      t.customerMobile,
      `"${t.serviceName}"`,
      t.flightDetails?.pnr || '',
      `"${t.flightDetails?.route || ''}"`,
      t.sellingPrice,
      t.customerPaid,
      t.customerDue,
      `"${t.vendorName || ''}"`,
      t.vendorCost,
      t.vendorDue,
      t.grossProfit,
      t.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIAM_AIR_TRANSACTIONS_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-blue-600" />
            <span>All Business Transactions & Invoices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Comprehensive audit registry with customer & vendor financial postings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Date Range Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, vendor, invoice #, PNR, mobile, ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <button
              onClick={() => setDateRange('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'today' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'yesterday' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'week' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'month' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                dateRange === 'custom' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Payment Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIAL">PARTIAL DUE</option>
              <option value="DUE">UNPAID / DUE</option>
              <option value="REFUND">REFUND</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {/* Metric Summary of filtered results */}
          <div className="flex items-center gap-3 font-mono font-semibold text-xs">
            <span>Sales: <strong className="text-slate-900">{formatCurrency(totalSales)}</strong></span>
            <span>Paid: <strong className="text-emerald-700">{formatCurrency(totalPaid)}</strong></span>
            <span>Due: <strong className="text-rose-600">{formatCurrency(totalDue)}</strong></span>
            <span>Profit: <strong className="text-emerald-600">{formatCurrency(totalProfit)}</strong></span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100 font-mono">
              <tr>
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Service & Route / PNR</th>
                <th className="py-3 px-4">Vendor & Cost</th>
                <th className="py-3 px-4 text-right">Sale Price</th>
                <th className="py-3 px-4 text-right">Customer Paid</th>
                <th className="py-3 px-4 text-right">Customer Due</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const statusStyle = getTransactionStatusColor(tx.status);
                  const hasDue = tx.customerDue > 0;

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">{tx.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatDate(tx.date)} {formatTime(tx.time)}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-900">{tx.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{tx.customerMobile}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 font-sans">{tx.serviceName}</div>
                        {tx.flightDetails && (
                          <div className="text-[11px] text-blue-600 flex items-center gap-1 font-mono">
                            <Plane className="w-3 h-3 inline" />
                            <span>
                              {tx.flightDetails.route} · PNR: <strong>{tx.flightDetails.pnr}</strong>
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {tx.vendorName ? (
                          <div>
                            <div className="font-medium text-slate-800 font-sans">{tx.vendorName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Cost: {formatCurrency(tx.vendorCost)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans">Direct Service</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(tx.sellingPrice)}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(tx.customerPaid)}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({tx.customerPaymentMethod})
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {hasDue ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatCurrency(tx.customerDue)}
                          </span>
                        ) : (
                          <span className="text-slate-400">৳0</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold tabular-nums text-emerald-700">
                        {formatCurrency(tx.grossProfit)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <button
                              onClick={() => onOpenPayment(tx, 'customer')}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                            >
                              Pay
                            </button>
                          )}

                          <button
                            onClick={() => onSelectTransaction(tx)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {currentUser?.permissions.canDeleteTransaction && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete Invoice ${tx.invoiceNumber}? This will be recorded permanently in the Audit History.`
                                  )
                                ) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Transaction (Audit Logged)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
