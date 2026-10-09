import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Save, Wallet } from 'lucide-react';
import { api } from '../../services/apiClient';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

type Adjustment = {
  id: string;
  direction: 'cash_in' | 'cash_out';
  account_name: string;
  amount: number | string;
  occurred_at: string;
  reason: string;
  note?: string | null;
  created_by_name?: string | null;
};

const accounts = [
  ['cash', 'Cash'], ['bkash', 'bKash'], ['nagad', 'Nagad'], ['rocket', 'Rocket'],
  ['bank', 'Bank'], ['card', 'Card'], ['other', 'Other'],
];

const localDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export const CashAdjustment: React.FC = () => {
  const { currentUser } = useApp();
  const [items, setItems] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [account, setAccount] = useState('cash');
  const [amount, setAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const role = String(currentUser?.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const canEdit = ['admin', 'administrator', 'owner', 'superadmin', 'superuser', 'businessowner'].includes(role) ||
    currentUser?.permissions?.canEditTransaction === true;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.cashAdjustments();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cash adjustments could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditingId(null); setDirection('cash_out'); setAccount('cash'); setAmount('');
    setOccurredAt(localDateTime()); setReason(''); setNote('');
  };

  const startEdit = (item: Adjustment) => {
    setEditingId(item.id);
    setDirection(item.direction);
    setAccount(item.account_name);
    setAmount(String(item.amount));
    setOccurredAt(localDateTime(item.occurred_at));
    setReason(item.reason || '');
    setNote(item.note || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !reason.trim()) {
      setError('সঠিক Amount এবং adjustment-এর কারণ লিখুন।');
      return;
    }
    setSaving(true);
    try {
      const payload = { direction, account, amount: value, occurredAt: new Date(occurredAt).toISOString(), reason: reason.trim(), note: note.trim() || null };
      if (editingId) await api.updateCashAdjustment(editingId, payload);
      else await api.createCashAdjustment(payload);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adjustment save করা যায়নি।');
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700"><Wallet className="h-6 w-6" /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cash Adjustment</h1>
          <p className="text-sm text-slate-500">দিন শেষে হাতে থাকা টাকা ও সিস্টেম ব্যালেন্সের পার্থক্য ঠিক করুন।</p>
        </div>
        <button onClick={() => void load()} className="ml-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection('cash_in')} className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${direction === 'cash_in' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}><ArrowDownToLine className="h-4 w-4" /> Cash In / Excess</button>
              <button type="button" onClick={() => setDirection('cash_out')} className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${direction === 'cash_out' ? 'border-rose-600 bg-rose-50 text-rose-700' : 'border-slate-200'}`}><ArrowUpFromLine className="h-4 w-4" /> Cash Out / Shortage</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm">
              {accounts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount (৳)</label>
            <input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="যেমন 300" className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date & Time</label>
            <input type="datetime-local" required value={occurredAt} onChange={e => setOccurredAt(e.target.value)} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason *</label>
            <input required value={reason} onChange={e => setReason(e.target.value)} placeholder="যেমন: দিনের শেষে ক্যাশ শর্ট / অতিরিক্ত ক্যাশ পাওয়া গেছে" className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="অতিরিক্ত বিবরণ" className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          </div>
        </div>
        {direction === 'cash_out' && <p className="text-xs text-rose-700">Cash Out দিলে নির্বাচিত account-এর balance কমবে। এটি Expense বা Profit/Loss-এ যোগ হবে না।</p>}
        {direction === 'cash_in' && <p className="text-xs text-emerald-700">Cash In দিলে নির্বাচিত account-এর balance বাড়বে। এটি Sales বা Profit/Loss-এ যোগ হবে না।</p>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={saving} type="submit" className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving…' : editingId ? 'Save Correction' : 'Save Adjustment'}</button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-3 text-sm">Cancel Edit</button>}
        </div>
        {editingId && !canEdit && <p className="text-xs text-amber-700">Correction permission may be restricted to an administrator.</p>}
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div><h2 className="font-bold text-slate-900">Adjustment History</h2><p className="text-xs text-slate-500">এই রেকর্ডগুলো Account Balance-এ প্রভাব ফেলে; Profit/Loss-এ নয়।</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{items.length} records</span>
        </div>
        {loading ? <p className="p-5 text-sm text-slate-500">Loading adjustments…</p> : items.length === 0 ? <p className="p-5 text-sm text-slate-500">এখনো কোনো Cash Adjustment নেই।</p> : (
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.direction === 'cash_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.direction === 'cash_in' ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">{accounts.find(a => a[0] === item.account_name)?.[1] || item.account_name} · {new Date(item.occurred_at).toLocaleString()} {item.created_by_name ? `· ${item.created_by_name}` : ''}</p>
                  {item.note && <p className="mt-1 break-words text-sm text-slate-600">{item.note}</p>}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <strong className={`text-base tabular-nums ${item.direction === 'cash_in' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.direction === 'cash_in' ? '+' : '−'}{formatCurrency(Number(item.amount))}</strong>
                  {canEdit && <button onClick={() => startEdit(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
