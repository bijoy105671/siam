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
  X,
  Save,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Transaction, TransactionStatus } from '../../types';
import { formatCurrency, formatDate, formatTime, getTransactionStatusColor } from '../../utils/formatters';

interface TransactionListProps {
  onSelectTransaction: (tx: Transaction) => void;
  onOpenNewEntry: () => void;
  paymentFocus?: 'customer' | 'vendor' | null;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onSelectTransaction,
  onOpenNewEntry,
  paymentFocus = null,
  onOpenPayment,
}) => {
  const { transactions, partialPayments, transfers, services, vendors, addVendorAsync, deleteTransaction, updateTransaction, currentUser } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState<'all' | 'sale' | 'customer_payment' | 'vendor_payment' | 'transfer'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFlightStatus, setEditFlightStatus] = useState('Confirmed');
  const [editReminderDate, setEditReminderDate] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editVendorId, setEditVendorId] = useState('');
  const [editVendorName, setEditVendorName] = useState('');
  const [editVendorCost, setEditVendorCost] = useState<number | ''>('');
  const [editVendorPaid, setEditVendorPaid] = useState<number | ''>('');
  const [editVendorPaymentMethod, setEditVendorPaymentMethod] = useState<PaymentMethod>('Cash');
  const [editVendorDue, setEditVendorDue] = useState<number | ''>('');
  const [editSellingPrice, setEditSellingPrice] = useState<number | ''>('');
  const [editCustomerPaid, setEditCustomerPaid] = useState<number | ''>('');
  const [editCustomerPaymentMethod, setEditCustomerPaymentMethod] = useState<PaymentMethod>('Cash');
  const [editCustomerDue, setEditCustomerDue] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering logic
  // Use the browser's local calendar date instead of UTC (toISOString),
  // otherwise Bangladesh users can see Today/Yesterday shift around midnight.
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = toLocalDateString(now);

  // Transaction dates are stored as PostgreSQL DATE values (YYYY-MM-DD).
  // Keep the calendar date as-is instead of parsing it through Date/UTC.
  // This makes Today/Yesterday/Custom work consistently on phone and desktop.
  const normalizeTransactionDate = (value: unknown) => {
    if (typeof value !== 'string') return '';
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : value.trim();
  };

  type DisplayTransaction = Transaction & {
    recordType?: 'sale' | 'payment' | 'transfer';
    transferFrom?: string;
    transferTo?: string;
    transferAmount?: number;
    transferReason?: string;
    paymentType?: 'customer' | 'vendor';
    paymentAmount?: number;
    paymentMethodDisplay?: string;
    paymentReference?: string;
  };

  // Due settlements are real accounting/payment transactions, but they are
  // deliberately kept outside the sales transaction table in the database.
  // Here we add them only to the All Transactions display so they can be
  // audited without affecting Sales, Profit, or invoice totals.
  const displayTransactions: DisplayTransaction[] = [
    ...transactions.map((tx) => ({ ...tx, recordType: 'sale' as const })),
    ...partialPayments.map((p) => ({
      id: p.id,
      invoiceNumber: p.reference || `PAY-${p.id.slice(0, 8)}`,
      date: p.date,
      time: p.time,
      createdBy: p.recordedBy,
      customerId: p.paymentType === 'customer' ? p.entityId : '',
      customerName: p.paymentType === 'customer' ? p.entityName : '—',
      customerMobile: '',
      serviceId: '',
      serviceName: p.paymentType === 'customer' ? 'Customer Due Payment' : 'Vendor Due Payment',
      sellingPrice: 0,
      customerPaid: 0,
      customerDue: 0,
      customerPaymentMethod: p.paymentType === 'customer' ? p.paymentMethod : 'Cash',
      vendorId: p.paymentType === 'vendor' ? p.entityId : undefined,
      vendorName: p.paymentType === 'vendor' ? p.entityName : undefined,
      vendorCost: 0,
      vendorPaid: 0,
      vendorDue: 0,
      vendorPaymentMethod: p.paymentType === 'vendor' ? p.paymentMethod : undefined,
      grossProfit: 0,
      status: 'PAID' as const,
      notes: p.note,
      recordType: 'payment' as const,
      paymentType: p.paymentType,
      paymentAmount: Number(p.amount || 0),
      paymentMethodDisplay: p.paymentMethod,
      paymentReference: p.reference || undefined,
    })),
    ...transfers.map((tr) => ({
      id: tr.id,
      invoiceNumber: `TRANSFER-${tr.id.replace(/^trf_/, '')}`,
      date: tr.date,
      time: tr.time,
      createdBy: tr.createdBy,
      customerId: '', customerName: 'Fund Transfer', customerMobile: '',
      serviceId: '', serviceName: 'Fund Transfer',
      sellingPrice: 0, customerPaid: 0, customerDue: 0, customerPaymentMethod: tr.fromAccount,
      vendorCost: 0, vendorPaid: 0, vendorDue: 0, vendorPaymentMethod: tr.toAccount,
      grossProfit: 0, status: 'PAID' as const,
      recordType: 'transfer' as const,
      transferFrom: tr.fromAccount, transferTo: tr.toAccount,
      transferAmount: Number(tr.amount || 0), transferReason: tr.reason,
      notes: tr.note,
    })),
  ].sort((a, b) => {
    const dateCompare = normalizeTransactionDate(b.date).localeCompare(normalizeTransactionDate(a.date));
    if (dateCompare !== 0) return dateCompare;
    return String(b.time || '').localeCompare(String(a.time || ''));
  });

  const filteredTransactions = displayTransactions.filter((tx) => {
    const transactionDate = normalizeTransactionDate(tx.date);
    // 1. Text Search (Customer, Vendor, Invoice, PNR, Ticket, Service, Payment Reference)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        tx.customerName.toLowerCase().includes(q) ||
        tx.customerMobile.includes(q) ||
        tx.invoiceNumber.toLowerCase().includes(q) ||
        tx.serviceName.toLowerCase().includes(q) ||
        (tx.vendorName && tx.vendorName.toLowerCase().includes(q)) ||
        (tx.paymentReference && tx.paymentReference.toLowerCase().includes(q)) ||
        (tx.paymentMethodDisplay && tx.paymentMethodDisplay.toLowerCase().includes(q)) ||
        (tx.flightDetails &&
          (tx.flightDetails.pnr.toLowerCase().includes(q) ||
            tx.flightDetails.ticketNumber.toLowerCase().includes(q) ||
            tx.flightDetails.passengerName.toLowerCase().includes(q) ||
            tx.flightDetails.route.toLowerCase().includes(q)));
      if (!match) return false;
    }

    if (paymentMethodFilter !== 'all') {
      const methods = tx.recordType === 'payment' ? [tx.paymentMethodDisplay] : tx.recordType === 'transfer' ? [tx.transferFrom, tx.transferTo] : [tx.customerPaymentMethod, tx.vendorPaymentMethod];
      if (!methods.some((m) => String(m || '').toLowerCase() === paymentMethodFilter.toLowerCase())) return false;
    }

    // Record type filter keeps SALES visually distinct from due-settlement/payment records.
    if (recordFilter === 'sale' && tx.recordType !== 'sale') return false;
    if (recordFilter === 'customer_payment' && !(tx.recordType === 'payment' && tx.paymentType === 'customer')) return false;
    if (recordFilter === 'vendor_payment' && !(tx.recordType === 'payment' && tx.paymentType === 'vendor')) return false;
    if (recordFilter === 'transfer' && tx.recordType !== 'transfer') return false;

    // Payment records are displayed in All Transactions, but are not service/sale rows.
    if (tx.recordType === 'transfer') {
      if (serviceFilter !== 'all') return false;
      if (statusFilter !== 'all') return false;
    } else if (tx.recordType === 'payment') {
      if (serviceFilter !== 'all') return false;
      if (statusFilter !== 'all') return false;
    } else {
      if (serviceFilter !== 'all' && tx.serviceId !== serviceFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    }

    // 4. Date filter
    if (dateRange === 'today') {
      if (transactionDate !== todayStr) return false;
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = toLocalDateString(yesterday);
      if (transactionDate !== yStr) return false;
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sStr = toLocalDateString(sevenDaysAgo);
      if (transactionDate < sStr) return false;
    } else if (dateRange === 'month') {
      const firstOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
      if (transactionDate < firstOfMonth) return false;
    } else if (dateRange === 'custom') {
      if (customStart && transactionDate < customStart) return false;
      if (customEnd && transactionDate > customEnd) return false;
    }

    return true;
  });

  const totalSales = filteredTransactions.reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalPaid = filteredTransactions.reduce((sum, t) => sum + t.customerPaid, 0);
  const totalDue = filteredTransactions.reduce((sum, t) => sum + t.customerDue, 0);
  const totalProfit = filteredTransactions.reduce((sum, t) => sum + t.grossProfit, 0);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openTransactionEditor = (tx: Transaction) => {
    try {
      setEditingTransaction(tx);
      setEditFlightStatus(tx.flightDetails?.ticketStatus || 'Confirmed');
      setEditReminderDate(tx.reminderDate || '');
      setEditReminderTime(tx.reminderTime || '');
      setEditNote(tx.reminderNote || '');
      setEditServiceId(tx.serviceId || '');
      setEditVendorId(tx.vendorId || '');
      setEditVendorName(tx.vendorName || vendors.find((v) => v.id === tx.vendorId)?.name || '');
      setEditVendorCost(tx.vendorCost ?? '');
      setEditSellingPrice(tx.sellingPrice ?? '');
      setEditCustomerPaid(tx.customerPaid ?? '');
      setEditCustomerPaymentMethod((tx.customerPaymentMethod || 'Cash') as PaymentMethod);
      setEditCustomerDue(tx.customerDue ?? '');
    } catch (error) {
      console.error('Unable to open transaction editor:', error);
      window.alert('Edit window could not be opened. Please refresh and try again.');
    }
  };

  // PDF Export: opens a clean A4 print report so desktop and mobile browsers can Save as PDF.
  const handleExportPDF = () => {
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const rows = filteredTransactions.map((t) => {
      if (t.recordType === 'transfer') {
        return '<tr class="transfer-row"><td>' + escapeHtml(t.invoiceNumber) + '<br><small>' + escapeHtml(t.date) + ' ' + escapeHtml(t.time) + '</small></td><td>Fund Transfer</td><td>' + escapeHtml(t.transferReason || 'Account Transfer') + '</td><td>' + escapeHtml(t.transferFrom || '') + ' → ' + escapeHtml(t.transferTo || '') + '</td><td class="money">' + escapeHtml(formatCurrency(Number(t.transferAmount || 0))) + '</td><td>—</td><td>—</td><td>NON-SALE</td></tr>';
      }
      if (t.recordType === 'payment') {
        const customer = t.paymentType === 'customer';
        return '<tr class="payment ' + (customer ? 'customer-payment' : 'vendor-payment') + '"><td>' + escapeHtml(t.invoiceNumber) + '<br><small>' + escapeHtml(t.date) + ' ' + escapeHtml(t.time) + '</small></td><td>' + escapeHtml(customer ? t.customerName : t.vendorName) + '</td><td>' + escapeHtml(customer ? 'CUSTOMER DUE PAYMENT' : 'VENDOR DUE PAYMENT') + '</td><td>—</td><td>' + escapeHtml(formatCurrency(Number(t.paymentAmount || 0))) + '</td><td>—</td><td>—</td><td>' + escapeHtml(t.paymentMethodDisplay) + '</td></tr>';
      }
      return '<tr class="sale-row"><td><strong>' + escapeHtml(t.invoiceNumber) + '</strong><br><small>' + escapeHtml(t.date) + ' ' + escapeHtml(t.time) + '</small></td><td>' + escapeHtml(t.customerName) + '<br><small>' + escapeHtml(t.customerMobile) + '</small></td><td><strong>' + escapeHtml(t.serviceName) + '</strong><br><small>' + escapeHtml(t.flightDetails?.route || '') + (t.flightDetails?.pnr ? ' · PNR: ' + escapeHtml(t.flightDetails.pnr) : '') + '</small></td><td>' + escapeHtml(t.vendorName || '—') + '<br><small>Cost: ' + escapeHtml(formatCurrency(t.vendorCost)) + '</small></td><td class="money sale-money">' + escapeHtml(formatCurrency(t.sellingPrice)) + '</td><td class="money paid-money">' + escapeHtml(formatCurrency(t.customerPaid)) + '</td><td class="money due-money">' + escapeHtml(formatCurrency(t.customerDue)) + '</td><td class="money profit-money">' + escapeHtml(formatCurrency(t.grossProfit)) + '</td></tr>';
    }).join('');
    const report = '<!doctype html><html><head><meta charset="utf-8"><title>SIAM AIR — Transactions Report</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:9px;margin:0}.head{border-bottom:2px solid #15803d;padding-bottom:8px;margin-bottom:10px}.brand{font-size:18px;font-weight:800}.sub{color:#475569;margin-top:2px}.meta{margin-top:7px;font-size:8px;color:#64748b}.summary{display:flex;gap:16px;border:1px solid #cbd5e1;padding:7px;margin-bottom:10px}.summary b{font-size:10px}table{width:100%;border-collapse:collapse}th{background:#e2e8f0;text-align:left;font-size:8px;text-transform:uppercase;padding:5px;border:1px solid #cbd5e1}td{padding:5px;border:1px solid #e2e8f0;vertical-align:top}.sale-row{background:#fff}.sale-money{font-weight:800}.paid-money,.profit-money{color:#047857;font-weight:700}.due-money{color:#be123c;font-weight:700}.payment td{font-weight:700}.customer-payment{background:#ecfdf5;color:#065f46}.vendor-payment{background:#fff1f2;color:#9f1239}small{color:#64748b;font-weight:400}footer{margin-top:8px;text-align:right;color:#64748b;font-size:7px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="head"><div class="brand">SIAM AIR AND DIGITAL SERVICE</div><div class="sub">Business Transactions & Accounting Report</div><div class="meta">Generated: ' + escapeHtml(new Date().toLocaleString()) + ' · Records: ' + filteredTransactions.length + '</div></div><div class="summary"><span>Sales: <b>' + escapeHtml(formatCurrency(totalSales)) + '</b></span><span>Customer Paid: <b>' + escapeHtml(formatCurrency(totalPaid)) + '</b></span><span>Customer Due: <b>' + escapeHtml(formatCurrency(totalDue)) + '</b></span><span>Gross Profit: <b>' + escapeHtml(formatCurrency(totalProfit)) + '</b></span></div><table><thead><tr><th>Invoice / Date</th><th>Customer / Vendor</th><th>Service / Record</th><th>Vendor / Cost</th><th>Sale</th><th>Paid</th><th>Due</th><th>Profit / Payment Method</th></tr></thead><tbody>' + rows + '</tbody></table><footer>SIAM AIR AND DIGITAL SERVICE · All service in one doors</footer><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>';
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) { window.alert('Please allow pop-ups to export the PDF report.'); return; }
    popup.document.open(); popup.document.write(report); popup.document.close();
  };

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
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 border border-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Export filtered transactions as A4 PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

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
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value as 'all' | 'sale' | 'customer_payment' | 'vendor_payment' | 'transfer')}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Records</option>
              <option value="sale">🟢 SALES ONLY</option>
              <option value="customer_payment">Customer Due Paid</option>
              <option value="vendor_payment">Vendor Due Paid</option>
              <option value="transfer">Fund Transfers</option>
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as 'all' | PaymentMethod)}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank">Bank</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>

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
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="text-slate-500 font-sans">
          Showing <strong className="text-slate-800">{filteredTransactions.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredTransactions.length)}</strong> of <strong className="text-slate-800">{filteredTransactions.length}</strong> records
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans">Per page:</span>
          {[20, 50, 100].map((size) => (
            <button key={size} type="button" onClick={() => { setPageSize(size as 20 | 50 | 100); setCurrentPage(1); }} className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${pageSize === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              {size}
            </button>
          ))}
          <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40">Previous</button>
          <span className="font-mono text-slate-600">Page {safePage} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40">Next</button>
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
                paginatedTransactions.map((tx) => {
                  if (tx.recordType === 'transfer') {
                    return (
                      <tr key={tx.id} className="bg-sky-50/70 border-l-4 border-sky-400">
                        <td className="py-3 px-4">
                          <div className="font-bold text-sky-800 font-mono">{tx.invoiceNumber}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{formatDate(tx.date)} {formatTime(tx.time)}</div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-sky-800">FUND TRANSFER</div>
                          <div className="text-[10px] text-slate-500">Non-Sale Transaction</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sky-800 font-sans">{tx.transferReason || 'Account Transfer'}</div>
                          <div className="text-[10px] text-slate-500">Internal account movement</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sky-800 font-sans">{tx.transferFrom} → {tx.transferTo}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-sky-700">{formatCurrency(Number(tx.transferAmount || 0))}</td>
                        <td className="py-3 px-4 text-right text-slate-400">—</td>
                        <td className="py-3 px-4 text-right text-slate-400">—</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-400">—</td>
                        <td className="py-3 px-4 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-200">TRANSFER · NON-SALE</span></td>
                        <td className="py-3 px-4 text-right text-[10px] text-slate-500 font-sans">{tx.transferAmount ? formatCurrency(Number(tx.transferAmount)) : '—'}</td>
                      </tr>
                    );
                  }

                  if (tx.recordType === 'payment') {
                    const isCustomerPayment = tx.paymentType === 'customer';
                    const amount = Number(tx.paymentAmount || 0);
                    return (
                      <tr key={tx.id} className={isCustomerPayment ? 'bg-emerald-50/60' : 'bg-rose-50/60'}>
                        <td className="py-3 px-4">
                          <div className={`font-bold font-mono ${isCustomerPayment ? 'text-emerald-800' : 'text-rose-800'}`}>
                            {tx.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatDate(tx.date)} {formatTime(tx.time)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className={`font-semibold ${isCustomerPayment ? 'text-emerald-800' : 'text-rose-800'}`}>
                            {isCustomerPayment ? tx.customerName : '—'}
                          </div>
                          <div className="text-[10px] text-slate-500">Payment Transaction</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`font-semibold font-sans ${isCustomerPayment ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isCustomerPayment ? 'Customer Due Payment' : 'Vendor Due Payment'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {tx.paymentReference ? `Ref: ${tx.paymentReference}` : 'Settlement against due balance'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {!isCustomerPayment && tx.vendorName ? (
                            <div>
                              <div className="font-medium text-rose-800 font-sans">{tx.vendorName}</div>
                              <div className="text-[10px] text-slate-500">{tx.paymentMethodDisplay}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans">{isCustomerPayment ? tx.paymentMethodDisplay : '—'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-400">—</td>
                        <td className={`py-3 px-4 text-right font-bold tabular-nums ${isCustomerPayment ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {isCustomerPayment ? `+${formatCurrency(amount)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-400">—</td>
                        <td className={`py-3 px-4 text-right font-bold tabular-nums ${!isCustomerPayment ? 'text-rose-700' : 'text-slate-400'}`}>
                          {!isCustomerPayment ? `-${formatCurrency(amount)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isCustomerPayment ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                            {isCustomerPayment ? 'DUE PAID' : 'VENDOR PAID'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans text-[10px] text-slate-500">
                          {tx.paymentMethodDisplay} · {tx.paymentReference || 'No reference'}
                        </td>
                      </tr>
                    );
                  }

                  const statusStyle = getTransactionStatusColor(tx.status);
                  const hasDue = tx.customerDue > 0;
                  const vendorHasDue = tx.vendorDue > 0;

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-extrabold tracking-wide">SALE</span>
                          <span className="text-[10px] text-slate-400">Service Transaction</span>
                        </div>
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
                        {tx.vendorName && <div className="text-[10px] text-amber-700 font-sans">↳ Vendor: {tx.vendorName}</div>}
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
                          <div>
                            <span className="text-slate-400 font-sans">Direct Service</span>
                            {Number(tx.accountCost || 0) > 0 && (
                              <div className="text-[11px] text-rose-700 font-mono mt-0.5">
                                Account Cost ({tx.accountCostPaymentMethod || 'Account'}): {formatCurrency(Number(tx.accountCost || 0))}
                              </div>
                            )}
                          </div>
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
                              Customer Pay
                            </button>
                          )}
                          {vendorHasDue && (
                            <button
                              onClick={() => onOpenPayment(tx, 'vendor')}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors cursor-pointer"
                            >
                              Vendor Pay
                            </button>
                          )}

                          <button
                            onClick={() => onSelectTransaction(tx)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openTransactionEditor(tx);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Transaction (Admin + OTP)"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete Invoice ${tx.invoiceNumber}? This will be recorded permanently in the Audit History.`
                                  )
                                ) {
                                  void deleteTransaction(tx.id).catch((error) => {
                                    alert(error instanceof Error ? error.message : 'Transaction could not be deleted.');
                                  });
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

      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">Administrator Edit</div>
                <h3 className="text-base font-bold mt-0.5">Edit Transaction</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">{editingTransaction.invoiceNumber} · {editingTransaction.customerName}</p>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="p-2 rounded-lg hover:bg-white/10" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-bold text-rose-900">Admin Price Correction</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Selling Price</span>
                    <input type="number" min="0" value={editSellingPrice} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditSellingPrice(next);
                      if (next !== '') setEditCustomerDue(Math.max(0, Number(next) - Number(editCustomerPaid || 0)));
                    }} className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Customer Paid (Historical Correction)</span>
                    <input type="number" min="0" value={editCustomerPaid} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditCustomerPaid(next);
                      if (next !== '') setEditCustomerDue(Math.max(0, Number(editSellingPrice || 0) - Number(next)));
                    }} className="w-full px-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Additional Payment Account (when Paid increases)</span>
                    <select value={editCustomerPaymentMethod} onChange={(e) => setEditCustomerPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Bank">Bank</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Customer Due</span>
                    <input type="number" min="0" value={editCustomerDue} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditCustomerDue(next);
                      if (next !== '') setEditSellingPrice(Number(editCustomerPaid || 0) + Number(next));
                    }} className="w-full px-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><span className="text-slate-500 block">Current Historical Paid</span><strong>{formatCurrency(editingTransaction.customerPaid)}</strong></div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><span className="text-slate-500 block">New Calculated Due</span><strong className="text-rose-600">{formatCurrency(Math.max(0, Number(editSellingPrice || 0) - Number(editCustomerPaid || 0)))}</strong></div>
                </div>
                </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-bold text-blue-900">Customer ↔ Service ↔ Vendor Link</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Customer Service</span>
                    <select value={editServiceId} onChange={(e) => setEditServiceId(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">No service linked</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Vendor / Consolidator</span>
                    <input type="text" list="admin-vendor-suggestions" value={editVendorName} onChange={(e) => { const value = e.target.value; setEditVendorName(value); const match = vendors.find((v) => v.name.trim().toLowerCase() === value.trim().toLowerCase()); setEditVendorId(match?.id || ''); }} placeholder="Type vendor / consolidator name" className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <datalist id="admin-vendor-suggestions">{vendors.map((v) => <option key={v.id} value={v.name}>{v.company ? v.name + ' · ' + v.company : v.name}</option>)}</datalist>
                    <span className="block mt-1 text-[9px] text-slate-500">Type an existing vendor or enter a new name. A new vendor profile will be created automatically when you save.</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Vendor Cost</span>
                    <input type="number" min="0" value={editVendorCost} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditVendorCost(next);
                      if (next !== '') setEditVendorDue(Math.max(0, Number(next) - Number(editVendorPaid || 0)));
                    }} className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Vendor Paid (Historical / Partial)</span>
                    <input type="number" min="0" value={editVendorPaid} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditVendorPaid(next);
                      if (next !== '') setEditVendorDue(Math.max(0, Number(editVendorCost || 0) - Number(next)));
                    }} className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Vendor Payment Method (when Paid increases)</span>
                    <select value={editVendorPaymentMethod} onChange={(e) => setEditVendorPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Bank">Bank</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold text-slate-700 mb-1">Vendor Due</span>
                    <input type="number" min="0" value={editVendorDue} onChange={(e) => {
                      const next = e.target.value === '' ? '' : Number(e.target.value);
                      setEditVendorDue(next);
                      if (next !== '') setEditVendorCost(Number(editVendorPaid || 0) + Number(next));
                    }} className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {editingTransaction.customerDue > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(null);
                        onOpenPayment(editingTransaction, 'customer');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Pay Customer Due
                    </button>
                  )}
                  {Number(editVendorDue || 0) > 0 && editVendorId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(null);
                        onOpenPayment(editingTransaction, 'vendor');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Pay Vendor Due
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><span className="text-slate-500 block">Vendor Paid</span><strong className="text-slate-800">{formatCurrency(editingTransaction.vendorPaid)}</strong></div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><span className="text-slate-500 block">Vendor Due</span><strong className="text-amber-700">{formatCurrency(Math.max(0, Number(editVendorCost || 0) - Number(editingTransaction.vendorPaid || 0)))}</strong></div>
                </div>
              </div>

              {editingTransaction.flightDetails && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Flight Ticket Status</label>
                  <select value={editFlightStatus} onChange={(e) => setEditFlightStatus(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Confirmed</option>
                    <option>Schedule Changed</option>
                    <option>Reissued</option>
                    <option>Refund</option>
                    <option>Void</option>
                    <option>Cancelled</option>
                    <option>Completed</option>
                    <option>Other</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reminder Date</label>
                  <input type="date" value={editReminderDate} onChange={(e) => setEditReminderDate(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reminder Time</label>
                  <input type="time" value={editReminderTime} onChange={(e) => setEditReminderTime(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Note</label>
                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} placeholder="Reason / note for this edit..." className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-[10px] text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Admin + security OTP is required. The edit is recorded in Audit History.</span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditingTransaction(null)} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button
                  disabled={savingEdit}
                  onClick={async () => {
                    if (!editingTransaction) return;
                    setSavingEdit(true);
                    try {
                      const typedVendorName = editVendorName.trim();
                      let resolvedVendorId = editVendorId || '';
                      if (typedVendorName) {
                        const existingVendor = vendors.find((v) => v.name.trim().toLowerCase() === typedVendorName.toLowerCase());
                        if (existingVendor) {
                          resolvedVendorId = existingVendor.id;
                        } else {
                          const newVendor = await addVendorAsync({ name: typedVendorName, company: '', mobile: '', whatsapp: '', email: '', address: '', accountInfo: '', openingPayable: 0 });
                          resolvedVendorId = newVendor.id;
                        }
                      } else {
                        resolvedVendorId = '';
                      }

                      await updateTransaction(editingTransaction.id, {
                        reminderDate: editReminderDate || null,
                        reminderTime: editReminderTime || null,
                        reminderStatus: editReminderDate ? 'pending' : null,
                        reminderNote: editNote || null,
                        serviceId: editServiceId || null,
                        vendorId: resolvedVendorId || null,
                        vendorCost: Number(editVendorCost || 0),
                        vendorPaid: Number(editVendorPaid || 0),
                        vendorDue: Number(editVendorDue || 0),
                        vendorPaymentMethod: editVendorPaymentMethod,
                        sellingPrice: Number(editSellingPrice || 0),
                        customerPaid: Number(editCustomerPaid || 0),
                        customerPaymentMethod: editCustomerPaymentMethod,
                        customerDue: Number(editCustomerDue || 0),
                        ...(editingTransaction.flightDetails ? { flightStatus: editFlightStatus } : {}),
                      }, 'Admin transaction edit');
                      setEditingTransaction(null);
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Transaction could not be updated.');
                    } finally {
                      setSavingEdit(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
