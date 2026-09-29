import React, { useEffect, useState } from 'react';
import { ShoppingBag, RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';
import { api, USE_SERVER_API } from '../../services/apiClient';

type Order = {
  id: string;
  customer_name: string;
  phone: string;
  email?: string;
  service?: string;
  amount: number;
  note?: string;
  status: string;
  created_at: string;
};

const statuses = ['NEW','CONFIRMED','PROCESSING','READY','DELIVERED','COMPLETED','CANCELLED'];

export const EcommerceControl: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!USE_SERVER_API) return;
    setLoading(true);
    try {
      const rows = await api.storefrontOrders();
      setOrders(rows as Order[]);
    } catch (e) {
      console.error('E-commerce order load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.updateStorefrontOrder(id, status);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
            <ShoppingBag className="w-4 h-4" /> E-COMMERCE CONTROL
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1">E-commerce Orders</h1>
          <p className="text-xs text-slate-300 mt-1">Customer website orders are controlled from this Accounting system.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2">
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> Refresh
          </button>
          <a href="https://siam-air-ecom.onrender.com" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-2">
            Open Store <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500">Total Orders</div><div className="text-xl font-black">{orders.length}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500">New</div><div className="text-xl font-black text-blue-700">{orders.filter(o => o.status === 'NEW').length}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500">Processing</div><div className="text-xl font-black text-amber-600">{orders.filter(o => o.status === 'PROCESSING').length}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500">Completed</div><div className="text-xl font-black text-emerald-600">{orders.filter(o => o.status === 'COMPLETED').length}</div></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No e-commerce orders yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map(order => (
              <div key={order.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{order.customer_name}</div>
                  <div className="text-xs text-slate-500">{order.phone}{order.email ? ' · ' + order.email : ''}</div>
                  <div className="text-xs text-blue-700 font-semibold mt-1">{order.service || 'General enquiry'}</div>
                  {order.note && <div className="text-xs text-slate-600 mt-1">{order.note}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={order.status} onChange={e => void updateStatus(order.id, e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold">
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {order.status === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
