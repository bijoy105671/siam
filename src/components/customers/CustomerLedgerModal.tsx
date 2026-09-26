import React from 'react';
import { X, Printer, PhoneCall, MessageSquare, User, FileText, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Transaction } from '../../types';
import { formatCurrency, formatDate, formatTime, sanitizePhoneForWhatsapp } from '../../utils/formatters';

interface CustomerLedgerModalProps {
  customerId: string | null;
  onClose: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment?: (tx: Transaction) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customerId,
  onClose,
  onSelectTransaction,
  onOpenPayment,
}) => {
  const { getCustomerLedger, settings } = useApp();

  if (!customerId) return null;

  const ledger = getCustomerLedger(customerId);
  const customer = ledger.customer;
  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const whatsappMsg = encodeURIComponent(
    `LEDGER STATEMENT - ${settings.name}\nCustomer: ${customer.name}\nTotal Sales: ${formatCurrency(ledger.totalSales)}\nTotal Paid: ${formatCurrency(ledger.totalPaid)}\n*Current Outstanding Due: ${formatCurrency(ledger.currentDue)}*\n\nHelpline: ${settings.mobile}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Customer Ledger Statement</span>
          </div>

          <div className="flex items-center gap-2">
            {customer.mobile && (
              <a
                href={`https://wa.me/${sanitizePhoneForWhatsapp(customer.mobile)}?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Send Statement via WhatsApp"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </a>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-900">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {settings.name}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                {settings.address} · Helpline: {settings.mobile}
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <div className="font-bold text-base text-slate-900">CUSTOMER ACCOUNT STATEMENT</div>
              <div className="text-slate-500 mt-1">Generated: {formatDate(new Date().toISOString().split('T')[0])}</div>
            </div>
          </div>

          {/* Customer Profile Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Customer Name</div>
              <div className="font-bold text-sm text-slate-900">{customer.name}</div>
              <div className="text-slate-600">Mobile: {customer.mobile}</div>
              {customer.email && <div className="text-slate-500">{customer.email}</div>}
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Identity & Travel Docs</div>
              <div>Passport: <strong>{customer.passportNumber || 'N/A'}</strong></div>
              <div>Expiry: {customer.passportExpiry || 'N/A'}</div>
              <div>NID: {customer.nid || 'N/A'}</div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Account Financial Status</div>
              <div className="text-slate-600">Opening Due: {formatCurrency(customer.openingDue || 0)}</div>
              <div className="text-slate-600">Total Billed: {formatCurrency(ledger.totalSales)}</div>
              <div className="text-emerald-700 font-semibold">Total Paid: {formatCurrency(ledger.totalPaid)}</div>
              <div className="text-sm font-bold text-rose-600 mt-1">
                Net Balance Due: {formatCurrency(ledger.currentDue)}
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Service Transactions & Bill Invoices
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Service / Route</th>
                    <th className="py-2.5 px-3 text-right">Sale (Debit)</th>
                    <th className="py-2.5 px-3 text-right">Paid (Credit)</th>
                    <th className="py-2.5 px-3 text-right">Due Balance</th>
                    <th className="py-2.5 px-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Opening Due Row if present */}
                  {customer.openingDue > 0 && (
                    <tr className="bg-amber-50/50">
                      <td className="py-2.5 px-3 text-slate-500">-</td>
                      <td className="py-2.5 px-3 font-bold text-amber-800">OPENING DUE</td>
                      <td className="py-2.5 px-3 text-slate-600">Old manual account opening due balance</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(customer.openingDue)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">৳0</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatCurrency(customer.openingDue)}</td>
                      <td className="py-2.5 px-3 text-center no-print">-</td>
                    </tr>
                  )}

                  {ledger.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(tx.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{tx.invoiceNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{tx.serviceName}</div>
                        {tx.flightDetails && (
                          <div className="text-[10px] text-blue-600">{tx.flightDetails.route} · PNR: {tx.flightDetails.pnr}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(tx.sellingPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(tx.customerPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {tx.customerDue > 0 ? (
                          <span className="text-rose-600">{formatCurrency(tx.customerDue)}</span>
                        ) : (
                          <span className="text-slate-400">৳0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <button
                          onClick={() => {
                            onClose();
                            onSelectTransaction(tx);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Invoice
                        </button>
                        {tx.customerDue > 0 && onOpenPayment && (
                          <button onClick={() => onOpenPayment(tx)} className="ml-2 inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"><DollarSign className="w-3 h-3" /> Pay</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Receipts History */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Payment Receipts Log
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-2 px-3">Date & Time</th>
                    <th className="py-2 px-3">Reference / Invoice</th>
                    <th className="py-2 px-3">Payment Method</th>
                    <th className="py-2 px-3">Recorded By / Note</th>
                    <th className="py-2 px-3 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledger.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No payments recorded.
                      </td>
                    </tr>
                  ) : (
                    ledger.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">
                          {formatDate(p.date)} {p.time}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.reference || '-'}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.paymentMethod}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{p.note || p.recordedBy}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger Signatures */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Customer Signature / Acceptance:</div>
              <div className="w-44 border-b border-slate-300 h-8"></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">For {settings.name}:</div>
              <div className="w-44 border-b border-slate-300 h-8"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
