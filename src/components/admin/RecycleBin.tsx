import React, { useCallback, useEffect, useState } from 'react';
import { api, USE_SERVER_API } from '../../services/apiClient';

type DeletedTransaction = {
  id: string;
  invoice_number?: string;
  date?: string;
  deleted_at?: string;
  customer_name?: string;
  customer_mobile?: string;
  service_name?: string;
  vendor_name?: string;
  selling_price?: number | string;
  status?: string;
};

const money = (value: unknown) => {
  const amount = Number(value || 0);
  return '৳' + amount.toLocaleString('en-BD', { maximumFractionDigits: 2 });
};

const displayDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

export const RecycleBin: React.FC = () => {
  const [items, setItems] = useState<DeletedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!USE_SERVER_API) {
        setItems([]);
        setError('Recycle Bin is available when connected to the production server.');
        return;
      }
      const rows = await api.recycleBin();
      setItems(Array.isArray(rows) ? rows as DeletedTransaction[] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Recycle Bin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const restore = async (item: DeletedTransaction) => {
    const invoice = item.invoice_number || item.id;
    if (!window.confirm(`Restore invoice ${invoice}? This will return it to active transactions.`)) return;
    setRestoringId(item.id);
    setError('');
    setNotice('');
    try {
      await api.restoreTransaction(item.id);
      setNotice(`Invoice ${invoice} restored successfully.`);
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore this transaction.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Recycle Bin</h1>
          <p className="mt-1 text-sm text-slate-500">Deleted invoices can be restored within 30 days. Nothing is permanently deleted from this screen.</p>
        </div>
        <button type="button" onClick={() => void loadItems()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Refresh
        </button>
      </div>

      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading deleted invoices…</div>
        ) : items.length === 0 && !error ? (
          <div className="p-8 text-center">
            <div className="font-semibold text-slate-700">Recycle Bin is empty</div>
            <p className="mt-1 text-sm text-slate-500">Deleted invoices from the last 30 days will appear here.</p>
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice / Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Deleted At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.invoice_number || item.id}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.date || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{item.customer_name || 'Unknown customer'}</div>
                      <div className="text-xs text-slate-500">{item.customer_mobile || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.service_name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{money(item.selling_price)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{displayDate(item.deleted_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" disabled={restoringId !== null} onClick={() => void restore(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {restoringId === item.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">For account safety, access is restricted to administrators. Transactions older than 30 days cannot be restored using this screen.</p>
    </section>
  );
};
