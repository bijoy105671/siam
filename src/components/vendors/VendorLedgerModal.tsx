import React from 'react';
import { X, Printer, Briefcase, FileText, PhoneCall, MessageSquare, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction, Vendor } from '../../types';
import { formatCurrency, formatDate, sanitizePhoneForWhatsapp } from '../../utils/formatters';

interface VendorLedgerModalProps {
  vendorId: string | null;
  onClose: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment?: (tx: Transaction) => void;
}

export const VendorLedgerModal: React.FC<VendorLedgerModalProps> = ({
  vendorId,
  onClose,
  onSelectTransaction,
  onOpenPayment,
}) => {
  const { getVendorLedger, settings } = useApp();

  if (!vendorId) return null;

  const ledger = getVendorLedger(vendorId);
  const vendor = ledger.vendor;
  if (!vendor) return null;

  const handlePrint = () => {
    window.print();
  };

  const whatsappMsg = encodeURIComponent(
    `VENDOR LEDGER STATEMENT - ${settings.name}\nVendor: ${vendor.name}\nCompany: ${vendor.company || ''}\nTotal Cost / Purchases: ${formatCurrency(ledger.totalCost)}\nTotal Payments Disbursed: ${formatCurrency(ledger.totalPaid)}\n*Net Outstanding Payable: ${formatCurrency(ledger.currentPayable)}*\n\nHelpline: ${settings.mobile}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Vendor / Consolidator Ledger Statement</span>
          </div>

          <div className="flex items-center gap-2">
            {vendor.mobile && (
              <a
                href={`https://wa.me/${sanitizePhoneForWhatsapp(vendor.mobile)}?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Send via WhatsApp"
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

        {/* Printable Body */}
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
              <div className="font-bold text-base text-slate-900">VENDOR PAYABLE STATEMENT</div>
              <div className="text-slate-500 mt-1">Generated: {formatDate(new Date().toISOString().split('T')[0])}</div>
            </div>
          </div>

          {/* Profile Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Vendor / Agency</div>
              <div className="font-bold text-sm text-slate-900">{vendor.name}</div>
              <div className="text-slate-600">{vendor.company}</div>
              <div className="text-slate-500">Phone: {vendor.mobile}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-400 font-bold">Bank & Account Details</div>
              <div className="text-slate-700">{vendor.accountInfo || 'Counter settlement'}</div>
              <div className="text-slate-500">{vendor.address}</div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Payable Financial Balance</div>
              <div className="text-slate-600">Opening Payable: {formatCurrency(vendor.openingPayable || 0)}</div>
              <div className="text-slate-600">Total Purchases / Cost: {formatCurrency(ledger.totalCost)}</div>
              <div className="text-blue-600 font-semibold">Total Paid to Vendor: {formatCurrency(ledger.totalPaid)}</div>
              <div className="text-sm font-bold text-amber-800 mt-1">
                Net Outstanding Payable: {formatCurrency(ledger.currentPayable)}
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Purchases, Issuances & Vendor Cost Ledger
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice Ref</th>
                    <th className="py-2.5 px-3">Description / Route</th>
                    <th className="py-2.5 px-3 text-right">Vendor Cost</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Payable Due</th>
                    <th className="py-2.5 px-3 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Opening Payable */}
                  {vendor.openingPayable > 0 && (
                    <tr className="bg-amber-50/50">
                      <td className="py-2.5 px-3 text-slate-500">-</td>
                      <td className="py-2.5 px-3 font-bold text-amber-800">OPENING PAYABLE</td>
                      <td className="py-2.5 px-3 text-slate-600">Old manual account opening payable balance</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(vendor.openingPayable)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">৳0</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-800">{formatCurrency(vendor.openingPayable)}</td>
                      <td className="py-2.5 px-3 text-center no-print">-</td>
                    </tr>
                  )}

                  {ledger.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(tx.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{tx.invoiceNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{tx.serviceName} ({tx.customerName})</div>
                        {tx.flightDetails && (
                          <div className="text-[10px] text-blue-600">{tx.flightDetails.route} · PNR: {tx.flightDetails.pnr}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(tx.vendorCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-600 tabular-nums">
                        {formatCurrency(tx.vendorPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {tx.vendorDue > 0 ? (
                          <span className="text-amber-800">{formatCurrency(tx.vendorDue)}</span>
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
                        {tx.vendorDue > 0 && onOpenPayment && (
                          <button onClick={() => onOpenPayment(tx)} className="ml-2 inline-flex items-center gap-1 text-amber-700 hover:underline font-semibold"><DollarSign className="w-3 h-3" /> Pay</button>
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
              Disbursements & Payment Records
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-2 px-3">Date & Time</th>
                    <th className="py-2 px-3">Ref Invoice</th>
                    <th className="py-2 px-3">Payment Method</th>
                    <th className="py-2 px-3">Note / Bank Details</th>
                    <th className="py-2 px-3 text-right">Amount Paid</th>
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
                        <td className="py-2 px-3 text-right font-bold text-blue-600 tabular-nums">
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
              <div className="text-[10px] text-slate-400">Vendor Signature & Seal:</div>
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
