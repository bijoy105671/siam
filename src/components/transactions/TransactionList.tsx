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
  const { transactions, partialPayments, transfers, loanAdvances, services, vendors, addVendorAsync, deleteTransaction, updateTransaction, currentUser } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState<'all' | 'sale' | 'customer_payment' | 'vendor_payment' | 'loan_advance' | 'transfer'>('all');
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
    recordType?: 'sale' | 'payment' | 'loan_advance' | 'transfer';
    transferFrom?: string;
    transferTo?: string;
    transferAmount?: number;
    transferReason?: string;
    loanKind?: 'loan' | 'advance'; loanDirection?: 'received' | 'given'; loanPartyType?: 'customer' | 'vendor'; loanAmount?: number;
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
    ...loanAdvances.map((la) => ({
      id: la.id, invoiceNumber: `${la.kind.toUpperCase()}-${la.id.slice(0, 8)}`,
      date: la.date, time: la.time, createdBy: la.createdBy,
      customerId: la.partyType === 'customer' ? la.partyId : '', customerName: la.partyType === 'customer' ? la.partyName : '—', customerMobile: '',
      serviceId: '', serviceName: `${la.kind.toUpperCase()} ${la.direction === 'received' ? 'RECEIVED' : 'GIVEN'}`,
      sellingPrice: 0, customerPaid: 0, customerDue: 0, customerPaymentMethod: la.paymentMethod,
      vendorId: la.partyType === 'vendor' ? la.partyId : undefined, vendorName: la.partyType === 'vendor' ? la.partyName : undefined,
      vendorCost: 0, vendorPaid: 0, vendorDue: 0, vendorPaymentMethod: la.paymentMethod, grossProfit: 0, status: 'PAID' as const,
      notes: la.note, recordType: 'loan_advance' as const, loanKind: la.kind, loanDirection: la.direction, loanPartyType: la.partyType,
      loanAmount: Number(la.amount || 0), paymentMethodDisplay: la.paymentMethod, paymentReference: la.reference || undefined,
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
    if (recordFilter === 'vendor_payment' && !(tx.recordType === 'payment' && tx.paymentType === 'vendor')) return false;    if (recordFilter === 'loan_advance' && tx.recordType !== 'loan_advance') return false;
    if (recordFilter === 'transfer' && tx.recordType !== 'transfer') return false;
    // Payment records are displayed in All Transactions, but are not service/sale rows.
    if (tx.recordType === 'transfer' || tx.recordType === 'loan_advance') {
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

  const totalSales = filteredTransactions.filter((t) => t.recordType === 'sale').reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalPaid = filteredTransactions.filter((t) => t.recordType === 'sale').reduce((sum, t) => sum + t.customerPaid, 0);
  const totalDue = filteredTransactions.filter((t) => t.recordType === 'sale').reduce((sum, t) => sum + t.customerDue, 0);
  const totalProfit = filteredTransactions.filter((t) => t.recordType === 'sale').reduce((sum, t) => sum + t.grossProfit, 0);

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
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('
');
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