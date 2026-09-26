import React, { useState } from 'react';
import {
  WalletCards,
  Plus,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

export const ExpenseManager: React.FC = () => {
  const { expenses, expenseCategories, addExpense, deleteExpense, accountBalances } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(expenseCategories[0]?.name || 'Office Rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (methodFilter !== 'all' && e.paymentMethod !== methodFilter) return false;
    return true;
  });

  const totalExpenseFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter an expense description.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await addExpense({
      category: selectedCategory,
      description: description.trim(),
      amount: numAmount,
      paymentMethod,
      date,
      time,
        note: note.trim(),
      });

      setDescription('');
    setAmount('');
      setNote('');
      setIsModalOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Expense could not be recorded. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-rose-600" />
            <span>Business Expense Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Office rents, electricity, staff salary, marketing, and automatic account deductions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Expense Stats Banner & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase">
            Total Filtered Expenses
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums">
            {formatCurrency(totalExpenseFiltered)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Deducted from Cash/bKash/Bank liquid balances
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-700">Filter Records:</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Expense Categories</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Payment Accounts</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank">Bank</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100 font-mono">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Expense Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Paid From Account</th>
                <th className="py-3 px-4">Recorded By / Note</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No expense entries found matching filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(exp.date)} {exp.time}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-800">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">
                      {exp.note ? `Note: "${exp.note}" · ` : ''}
                      By: {exp.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm tabular-nums">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => {
                          if (confirm(`Delete expense ৳${exp.amount} (${exp.description})?`)) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Business Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  placeholder="e.g. DESCO Electricity Bill, Tea & snacks for clients"
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    placeholder="0"
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg text-rose-600 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Paid From Account
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Cash">Cash (Counter)</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank">Bank</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Note / Voucher Reference
                </label>
                <input
                  type="text"
                  value={note}
                  placeholder="Voucher # or Bill receipt ID"
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-between items-center gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setDescription('');
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
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  {submitError && (
                    <div className="text-[11px] text-rose-600 font-medium max-w-[220px]">{submitError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? 'Saving…' : 'Save & Deduct Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
