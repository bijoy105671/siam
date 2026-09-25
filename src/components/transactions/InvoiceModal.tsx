import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  MessageSquare,
  X,
  Plane,
  CheckCircle,
  AlertCircle,
  QrCode,
  Share2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatTime,
  getTicketStatusColor,
  sanitizePhoneForWhatsapp,
} from '../../utils/formatters';
import {
  generateVerificationUrl,
  generateQRCodeDataUrl,
} from '../../utils/invoiceVerification';
import { InvoiceVerificationPage } from '../verification/InvoiceVerificationPage';
import { WhatsAppSenderModal } from '../whatsapp/WhatsAppSenderModal';

interface InvoiceModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onOpenPayment?: (tx: Transaction, type: 'customer') => void;
  onOpenVerification?: (invoiceNumber: string, verificationUrl: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  transaction,
  onClose,
  onOpenPayment,
  onOpenVerification,
}) => {
  const { settings, customers, partialPayments } = useApp();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verifyUrl, setVerifyUrl] = useState<string>('');
  const [verifyHash, setVerifyHash] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEnlargedQr, setShowEnlargedQr] = useState(false);
  const [showVerifyPortalModal, setShowVerifyPortalModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    let isMounted = true;

    generateVerificationUrl(transaction, settings)
      .then(({ url, hash }) => {
        if (!isMounted) return;
        setVerifyUrl(url);
        setVerifyHash(hash);
        return generateQRCodeDataUrl(url, 300);
      })
      .then((qrData) => {
        if (!isMounted || !qrData) return;
        setQrCodeUrl(qrData);
      })
      .catch((err) => {
        console.error('Failed to generate verification QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [transaction, settings]);

  if (!transaction) return null;

  const customer = customers.find((c) => c.id === transaction.customerId);
  const txPayments = partialPayments.filter(
    (p) => p.transactionId === transaction.id && p.paymentType === 'customer'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!verifyUrl) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenVerificationPortal = () => {
    if (onOpenVerification && verifyUrl) {
      onOpenVerification(transaction.invoiceNumber, verifyUrl);
    } else {
      setShowVerifyPortalModal(true);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `*INVOICE: ${transaction.invoiceNumber}*\n*${settings.name}*\n\nCustomer: ${transaction.customerName}\nService: ${transaction.serviceName}\n${transaction.flightDetails ? `Route: ${transaction.flightDetails.route}\nFlight: ${transaction.flightDetails.flightNumber} (${transaction.flightDetails.airline})\nPNR: ${transaction.flightDetails.pnr}\nDeparture: ${formatDate(transaction.flightDetails.departureDate)} at ${formatTime(transaction.flightDetails.departureTime)}\n` : ''}Total Amount: ${formatCurrency(transaction.sellingPrice)}\nPaid: ${formatCurrency(transaction.customerPaid)}\n*Balance Due: ${formatCurrency(transaction.customerDue)}*\nStatus: ${transaction.status}\n\n*Verify Invoice Authenticity Online:*\n${verifyUrl || 'Available on invoice'}\n\nAddress: ${settings.address}\nHelpline: ${settings.mobile}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Top Controls (Hidden on Print) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Invoice #{transaction.invoiceNumber}</span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                transaction.status === 'PAID'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {transaction.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {transaction.customerDue > 0 && onOpenPayment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayment(transaction, 'customer');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Collect Due
              </button>
            )}

            <button
              onClick={handleOpenVerificationPortal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Open secure online verification page for this invoice"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Verify Authenticity</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer border border-emerald-700/60 shadow-xs"
              title="Open WhatsApp message sender with dynamic business templates"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div id="printable-invoice" className="p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div className="flex items-start gap-3">
              <img
                src={settings.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-14 h-14 object-contain rounded-lg border border-slate-200"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {settings.name}
                </h1>
                <p className="text-xs text-slate-600 font-medium">{settings.tagline}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">{settings.address}</p>
                <p className="text-xs text-slate-500 font-mono">
                  Mobile: {settings.mobile} · Email: {settings.email}
                </p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-left sm:text-right font-mono text-xs">
              <div className="text-xl font-bold text-slate-900">{transaction.invoiceNumber}</div>
              <div className="text-slate-500 mt-1">Date: {formatDate(transaction.date)}</div>
              <div className="text-slate-500">Time: {formatTime(transaction.time)}</div>
              <div className="mt-2 inline-block">
                <span
                  className={`px-3 py-1 rounded text-xs font-bold uppercase border ${
                    transaction.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {transaction.status === 'PAID' ? 'FULLY PAID' : `DUE: ${formatCurrency(transaction.customerDue)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Billed To / Passenger Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Billed To (Customer)
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{transaction.customerName}</div>
              <div className="text-slate-600">Mobile: {transaction.customerMobile}</div>
              {customer?.passportNumber && (
                <div className="text-slate-600 font-mono">Passport No: {customer.passportNumber}</div>
              )}
              {customer?.address && <div className="text-slate-500">{customer.address}</div>}
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Issued By / Desk
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">{transaction.createdBy}</div>
              <div className="text-slate-600">Service: {transaction.serviceName}</div>
              <div className="text-slate-500 font-mono">Ref: {transaction.id}</div>
            </div>
          </div>

          {/* Flight Details Box (If flight) */}
          {transaction.flightDetails && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 uppercase">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span>Flight Ticket & Itinerary Details</span>
                </div>
                <span className="font-mono font-bold text-blue-700">{transaction.flightDetails.ticketStatus}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono pt-1">
                <div>
                  <div className="text-[10px] text-slate-500">Sector / Route:</div>
                  <div className="font-bold text-slate-900">{transaction.flightDetails.route}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">PNR:</div>
                  <div className="font-bold text-blue-700">{transaction.flightDetails.pnr}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Airline / Flight:</div>
                  <div className="font-semibold text-slate-900">{transaction.flightDetails.airline} {transaction.flightDetails.flightNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Departure:</div>
                  <div className="font-bold text-slate-900">
                    {formatDate(transaction.flightDetails.departureDate)} · {formatTime(transaction.flightDetails.departureTime)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Passenger:</div>
                  <div className="font-semibold text-slate-900">{transaction.flightDetails.passengerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Ticket Number:</div>
                  <div className="font-semibold text-slate-900">{transaction.flightDetails.ticketNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Class:</div>
                  <div className="text-slate-900">{transaction.flightDetails.flightClass || 'Economy'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Baggage / Note:</div>
                  <div className="text-slate-700 truncate">{transaction.flightDetails.notes || 'Standard baggage'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Service Items Table */}
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">SL</th>
                <th className="py-2.5 px-3">Service & Description</th>
                <th className="py-2.5 px-3 text-right">Price (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-3 font-mono">1</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">{transaction.serviceName}</div>
                  <div className="text-slate-500">{transaction.description || 'Standard travel agency service booking'}</div>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrency(transaction.sellingPrice)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment & Ledger Balance Calculation */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-3 border-t border-slate-200">
            {/* Payment history list */}
            <div className="flex-1 space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                Payment History Record
              </div>
              {txPayments.length === 0 ? (
                <div className="text-slate-400 italic">No payments recorded yet.</div>
              ) : (
                <div className="space-y-1">
                  {txPayments.map((p, idx) => (
                    <div key={p.id} className="flex justify-between font-mono text-slate-600 bg-slate-50 p-1.5 rounded">
                      <span>
                        #{idx + 1} {formatDate(p.date)} ({p.paymentMethod})
                      </span>
                      <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Balance Calculations */}
            <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">{formatCurrency(transaction.sellingPrice)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Total Paid:</span>
                <span className="font-bold">{formatCurrency(transaction.customerPaid)}</span>
              </div>
              <div className="flex justify-between py-2 border-y-2 border-slate-900 text-sm">
                <span className="font-bold">Total Due:</span>
                <span className={`font-bold tabular-nums ${transaction.customerDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(transaction.customerDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Signatures */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
              <strong className="text-slate-700 uppercase">Terms & Conditions:</strong>
              <br />
              {settings.invoiceTerms}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-8 gap-4">
              {/* Authenticity QR Code & Security Stamp */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowEnlargedQr(true)}
                  className="w-24 h-24 border-2 border-slate-900 rounded-xl p-1 bg-white flex flex-col items-center justify-center shadow-xs cursor-pointer group hover:border-blue-600 transition shrink-0"
                  title="Click to enlarge QR code for easy smartphone scanning"
                >
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt={`Verification QR for ${transaction.invoiceNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8 animate-pulse text-slate-400" />
                      <span className="text-[7px]">Generating...</span>
                    </div>
                  )}
                </div>

                <div className="text-left font-mono space-y-0.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scan to Verify Authenticity</span>
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight">
                    Scan with any smartphone camera to view official verified record online
                  </div>
                  <div className="text-[8px] text-slate-400 truncate max-w-[220px]">
                    SHA-256: {verifyHash ? `${verifyHash.substring(0, 16)}...` : 'Generating Hash...'}
                  </div>

                  {/* Interactive controls (hidden on print) */}
                  <div className="flex items-center gap-2 pt-1 no-print">
                    <button
                      type="button"
                      onClick={handleOpenVerificationPortal}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Test Webpage</span>
                    </button>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {copiedLink ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => setShowEnlargedQr(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Enlarge</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Authorized Signature */}
              <div className="text-center sm:text-right shrink-0 mt-4 sm:mt-0">
                <div className="w-48 border-b-2 border-slate-900 pb-1 font-mono text-xs font-bold text-slate-800 sm:ml-auto">
                  {transaction.createdBy}
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold mt-1">
                  {settings.signatureLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal 1: Enlarged QR Code for Instant On-Screen Phone Scanning */}
        {showEnlargedQr && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-left">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Scan Invoice QR Code</h3>
                    <p className="text-[10px] font-mono text-slate-500">{transaction.invoiceNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEnlargedQr(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block shadow-inner">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`Enlarged QR Code for ${transaction.invoiceNumber}`}
                    className="w-56 h-56 object-contain mx-auto rounded"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                    Loading QR...
                  </div>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-800">Point your smartphone camera to scan</p>
                <p className="text-slate-500 text-[11px]">
                  Instantly directs to the secure verification webpage confirming invoice authenticity and payment status.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowEnlargedQr(false);
                    handleOpenVerificationPortal();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Page</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: In-Modal Full Verification Webpage Preview */}
        {showVerifyPortalModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono">
                    Public Verification Webpage Preview (Invoice #{transaction.invoiceNumber})
                  </span>
                </div>
                <button
                  onClick={() => setShowVerifyPortalModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <InvoiceVerificationPage
                  invoiceNumberFromUrl={transaction.invoiceNumber}
                  signatureFromUrl={verifyHash}
                  onBackToApp={() => setShowVerifyPortalModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: WhatsApp Sender Modal */}
        {showWhatsAppModal && (
          <WhatsAppSenderModal
            isOpen={showWhatsAppModal}
            onClose={() => setShowWhatsAppModal(false)}
            transaction={transaction}
            customer={customer}
            defaultTemplateKey={transaction.customerDue > 0 ? 'customerDueReminder' : 'invoiceShare'}
          />
        )}
      </div>
    </div>
  );
};
