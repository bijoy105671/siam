import React, { useEffect, useState } from 'react';
import { X, CheckCircle, MessageSquare, DollarSign, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Transaction } from '../../types';
import { formatCurrency, formatDate, sanitizePhoneForWhatsapp } from '../../utils/formatters';

interface PaymentModalProps {
  transaction: Transaction | null;
  paymentType: 'customer' | 'vendor';
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  transaction,
  paymentType,
  onClose,
}) => {
  const { addPartialPayment, settings, vendors } = useApp();

  if (!transaction) return null;

  const vendorOptions = paymentType === 'vendor'
    ? (transaction.serviceItems?.length
        ? Array.from(new Map(transaction.serviceItems.filter((item) => item.vendorId).map((item) => [
            item.vendorId as string,
            { id: item.vendorId as string, name: vendors.find((vendor) => vendor.id === item.vendorId)?.name || item.vendorName || 'Vendor' }
          ])).values())
        : (transaction.vendorId
            ? [{ id: transaction.vendorId, name: vendors.find((vendor) => vendor.id === transaction.vendorId)?.name || transaction.vendorName || 'Vendor' }]
            : []))
    : [];
  const [selectedVendorId, setSelectedVendorId] = useState(
    vendorOptions[0]?.id || transaction.vendorId || transaction.serviceItems?.find((item) => item.vendorId)?.vendorId || ''
  );
  const maxDue = paymentType === 'customer'
    ? transaction.customerDue
    : transaction.serviceItems?.length
      ? transaction.serviceItems.filter((item) => item.vendorId === selectedVendorId).reduce((sum, item) => sum + Number(item.vendorDue || 0), 0)
      : transaction.vendorDue;
  const entityName = paymentType === 'customer'
    ? transaction.customerName
    : (vendorOptions.find((vendor) => vendor.id === selectedVendorId)?.name || transaction.vendorName || 'Vendor');

  useEffect(() => {
    setAmount(maxDue);
  }, [maxDue]);

  const [amount, setAmount] = useState<number | ''>(maxDue);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [recordedAmount, setRecordedAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      await addPartialPayment({
        transactionId: transaction.id,
        entityId: paymentType === 'vendor' ? selectedVendorId : undefined,
        paymentType,
        amount: numAmount,
        paymentMethod: method,
        date: todayStr,
        time: timeStr,
        note: note || `Partial payment for Ref: ${transaction.invoiceNumber}`,
        reference: transaction.invoiceNumber,
        paidAt: `${todayStr}T${timeStr}:00+06:00`,
      });
      setRecordedAmount(numAmount);
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Payment could not be recorded. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = Math.max(0, maxDue - recordedAmount);
  const isFullyPaid = remainingAfterPayment === 0;

  const thankYouMessage = encodeURIComponent(
    isFullyPaid
      ? `Dear ${entityName},\nThank you! Your payment of ${formatCurrency(recordedAmount)} via ${method} for Invoice ${transaction.invoiceNumber} has been received. Your balance is ৳0 (PAID in Full).\nThank you for choosing ${settings.name}!\nHelpline: ${settings.mobile}`
      : `Dear ${entityName},\nWe received ${formatCurrency(recordedAmount)} via ${method} for Invoice ${transaction.invoiceNumber}. Remaining balance: ${formatCurrency(remainingAfterPayment)}.\nRegards, ${settings.name}\nHelpline: ${settings.mobile}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {paymentType === 'customer' ? 'Customer Due Collection' : 'Vendor Payment Settlement'}
            </div>
            <h2 className="text-base font-bold text-white">
              {paymentType === 'customer' ? 'Record Customer Payment' : 'Pay Vendor'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Payment Recorded Successfully</h3>
              <p className="text-xs text-slate-500 mt-1">
                Amount: <strong className="text-emerald-700 font-mono">{formatCurrency(recordedAmount)}</strong> via {method}
              </p>
              <div className="mt-2 text-xs font-mono">
                {isFullyPaid ? (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    STATUS: FULLY PAID (৳0 Due)
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    REMAINING DUE: {formatCurrency(remainingAfterPayment)}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {paymentType === 'customer' && transaction.customerMobile && (
                <a
                  href={`https://wa.me/${sanitizePhoneForWhatsapp(transaction.customerMobile)}?text=${thankYouMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Confirmation</span>
                </a>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Target Details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">{paymentType === 'customer' ? 'Customer:' : 'Vendor:'}</span>
                <span className="font-bold text-slate-900">{entityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Reference:</span>
                <span className="font-bold text-slate-900">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Current Outstanding Due:</span>
                <span className="font-bold text-rose-600">{formatCurrency(maxDue)}</span>
              </div>
              <div className="mt-2 rounded-lg bg-white border border-blue-200 p-2 text-[10px] font-sans">
                <strong className="text-blue-800">Payment will create a new payment transaction record.</strong>
                <div className="text-slate-500 mt-0.5">Customer payment ↑ selected account balance · Vendor payment ↓ selected account balance</div>
              </div>
            </div>

            {paymentType === 'vendor' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vendor linked to this service <span className="text-rose-500">*</span>
                </label>
                {vendorOptions.length > 0 ? (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {vendorOptions.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    No vendor is linked to this invoice yet. Close this window, edit the invoice to link the correct vendor, then record payment.
                  </p>
                )}
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Amount (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={maxDue}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setAmount(maxDue)}
                  className="text-[11px] text-blue-600 hover:underline font-mono"
                >
                  Pay Full ({formatCurrency(maxDue)})
                </button>
                {maxDue > 5000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(maxDue / 2))}
                    className="text-[11px] text-slate-500 hover:underline font-mono"
                  >
                    Pay 50% ({formatCurrency(Math.round(maxDue / 2))})
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Account / Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Cash">Cash (Counter)</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank">Bank Deposit / Cheque</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
              <div className="text-[10px] text-slate-500 mt-1">
                {paymentType === 'customer'
                  ? `Customer payment: ${method} balance will increase immediately.`
                  : `Vendor payment: ${method} balance will decrease immediately.`}
              </div>
            </div>

            {/* Notes / Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Note / TrxID
              </label>
              <input
                type="text"
                value={note}
                placeholder="e.g. bKash TrxID #8M912K87, Cheque #091244"
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              {submitError && (
                <div className="mr-auto text-[11px] text-rose-600 font-medium max-w-[220px]">{submitError}</div>
              )}
              <button
                type="submit"
                disabled={isSubmitting || (paymentType === 'vendor' && (!selectedVendorId || maxDue <= 0))}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Saving Payment…' : paymentType === 'customer' ? 'Receive Customer Payment' : 'Pay Vendor & Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
