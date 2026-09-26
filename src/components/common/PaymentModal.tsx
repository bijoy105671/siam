import React, { useState } from 'react';
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
  const { addPartialPayment, settings } = useApp();

  if (!transaction) return null;

  const maxDue = paymentType === 'customer' ? transaction.customerDue : transaction.vendorDue;
  const entityName = paymentType === 'customer' ? transaction.customerName : (transaction.vendorName || 'Vendor');

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
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    try {
      await addPartialPayment({
        transactionId: transaction.id,
        paymentType,
        amount: numAmount,
        paymentMethod: method,
        date: todayStr,
        time: timeStr,
        note: note || `Partial payment for Ref: ${transaction.invoiceNumber}`,
        reference: transaction.invoiceNumber,
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
            </div>

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
                  ? `Will increase ${method} balance automatically.`
                  : `Will decrease ${method} balance automatically.`}
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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Recording…' : 'Confirm & Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
