import React, { useState } from 'react';
import { ArrowLeftRight, X, CheckCircle, Landmark, Wallet, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface FundTransferModalProps {
  onClose: () => void;
}

export const FundTransferModal: React.FC<FundTransferModalProps> = ({ onClose }) => {
  const { accountBalances, addFundTransfer, transfers, totalAvailableMoney } = useApp();

  const [fromAccount, setFromAccount] = useState<PaymentMethod>('Cash');
  const [toAccount, setToAccount] = useState<PaymentMethod>('Bank');
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('Bank Deposit');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const availableInFrom = accountBalances[fromAccount] || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }
    if (fromAccount === toAccount) {
      alert('From Account and To Account must be different.');
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    addFundTransfer({
      fromAccount,
      toAccount,
      amount: numAmount,
      date: todayStr,
      time: timeStr,
      reason,
      note: note.trim(),
    });

    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold">Internal Balance / Fund Transfer</h2>
              <p className="text-[11px] text-slate-400">
                Moves liquid money between accounts without altering total available money
              </p>
            </div>
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
              <h3 className="font-bold text-slate-900 text-base">Transfer Completed Successfully</h3>
              <p className="text-xs text-slate-500 mt-1">
                Moved <strong className="text-slate-900 font-mono">{formatCurrency(Number(amount))}</strong> from{' '}
                <strong className="text-blue-700">{fromAccount}</strong> to{' '}
                <strong className="text-emerald-700">{toAccount}</strong>.
              </p>
              <div className="text-[11px] text-emerald-600 font-mono mt-1">
                Total Available Money remains: {formatCurrency(totalAvailableMoney)}
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setAmount('');
                  setNote('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Another Transfer
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Account Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  From Account (Source)
                </label>
                <select
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="Cash">Cash (Counter)</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Bank">Bank (City/Islami)</option>
                  <option value="Card">Card</option>
                </select>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Balance: <strong>{formatCurrency(availableInFrom)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  To Account (Destination)
                </label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="Bank">Bank (City/Islami)</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Cash">Cash (Counter)</option>
                  <option value="Card">Card</option>
                </select>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Balance: <strong>{formatCurrency(accountBalances[toAccount] || 0)}</strong>
                </div>
              </div>
            </div>

            {/* Transfer Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transfer Amount (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                placeholder="0"
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transfer Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
              >
                <option value="Bank Deposit">Bank Deposit</option>
                <option value="Cash Withdrawal">Cash Withdrawal</option>
                <option value="bKash Top-up">bKash Top-up</option>
                <option value="Cash Collection">Cash Collection</option>
                <option value="Office Cash Requirement">Office Cash Requirement</option>
                <option value="Business Fund Transfer">Business Fund Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Note / Reference ID
              </label>
              <input
                type="text"
                value={note}
                placeholder="Deposit slip number or bKash TrxID"
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div className="pt-3 flex justify-between items-center gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAmount('');
                  setNote('');
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
              >
                Clear Form
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Recent Transfer History */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
            Recent Fund Transfer Logs
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs font-mono">
            {transfers.length === 0 ? (
              <div className="text-slate-400 text-[11px] italic">No transfers executed yet.</div>
            ) : (
              transfers.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {t.fromAccount} → {t.toAccount} ({t.reason})
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDate(t.date)} {t.time} · By: {t.createdBy}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 tabular-nums">
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
