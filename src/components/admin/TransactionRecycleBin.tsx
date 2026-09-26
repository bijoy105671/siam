import React, { useEffect, useState } from 'react';
import { ArchiveRestore, Clock3, FileText, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../../services/apiClient';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

type DeletedTransaction = Record<string, any>;

const daysLeft = (deletedAt: string) => {
  const age = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, 30 - Math.floor(age / (1000 * 60 * 60 * 24)));
};

export const TransactionRecycleBin: React.FC = () => {
  const [items, setItems] = useState<DeletedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems((await api.recycleBin()) as DeletedTransaction[]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Recycle Bin could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const restore = async (tx: DeletedTransaction) => {
    const remaining = daysLeft(tx.deleted_at);
    if (remaining <= 0) {
      alert('This transaction is older than 30 days and cannot be restored.');
      return;
    }
    if (!confirm(`Restore invoice ${tx.invoice_number || tx.invoiceNumber}? It will return to Transactions and its payment/accounting entries will be restored.`)) return;
    setRestoring(tx.id);
    try {
      await api.restoreTransaction(tx.id);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Transaction could not be restored.');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Administrator Recovery Area
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold flex items-center gap-2">
              <ArchiveRestore className="w-6 h-6" /> Transaction Recycle Bin
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Deleted transactions remain recoverable for 30 days. Restore returns the original transaction and its accounting links.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading deleted transactions...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-8 h-8 mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Recycle Bin is empty</p>
            <p className="text-xs text-slate-400 mt-1">Deleted transactions from the last 30 days will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice / Deleted</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4 text-right">Sale</th>
                  <th className="py-3 px-4">Recovery Window</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tx) => {
                  const left = daysLeft(tx.deleted_at);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.invoice_number}</div>
                        <div className="text-[10px] text-slate-500">
                          Deleted {formatDate(String(tx.deleted_at).slice(0, 10))} {String(tx.deleted_at).slice(11, 16)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{tx.customer_name}</div>
                        <div className="text-[10px] text-slate-500">{tx.customer_mobile}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold text-slate-700"><FileText className="w-3.5 h-3.5 text-blue-500" />{tx.service_name || '—'}</div>
                        <div className="text-[10px] text-slate-400">{tx.flight_details?.pnr ? `PNR: ${tx.flight_details.pnr}` : ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(Number(tx.selling_price || 0))}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${left <= 5 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          <Clock3 className="w-3 h-3" /> {left} day{left === 1 ? '' : 's'} left
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => void restore(tx)} disabled={restoring === tx.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold disabled:opacity-50">
                          <ArchiveRestore className={`w-3.5 h-3.5 ${restoring === tx.id ? 'animate-spin' : ''}`} />
                          {restoring === tx.id ? 'Restoring...' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
