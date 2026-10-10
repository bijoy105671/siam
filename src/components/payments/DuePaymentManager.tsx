import React, { useMemo, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Vendor, Transaction, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CustomerLedgerModal } from '../customers/CustomerLedgerModal';
import { VendorLedgerModal } from '../vendors/VendorLedgerModal';
import { api } from '../../services/apiClient';

interface DuePaymentManagerProps { type: 'customer' | 'vendor'; onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void; onSelectTransaction: (tx: Transaction) => void; }

export const DuePaymentManager: React.FC<DuePaymentManagerProps> = ({ type, onOpenPayment, onSelectTransaction }) => {
  const { customers, vendors, getCustomerLedger, getVendorLedger } = useApp();
  const [search, setSearch] = useState('');
  const [statementId, setStatementId] = useState<string | null>(null);
  const [openingPayment, setOpeningPayment] = useState<{id:string;name:string;amount:number} | null>(null);
  const [amount, setAmount] = useState<number | ''>(0);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (type === 'customer') return customers.map((p: Customer) => ({ id:p.id,name:p.name,mobile:p.mobile,due:getCustomerLedger(p.id).currentDue })).filter(p => p.due > 0 && (!q || p.name.toLowerCase().includes(q) || (p.mobile || '').includes(q)));
    return vendors.map((p: Vendor) => ({ id:p.id,name:p.name,mobile:p.mobile,due:getVendorLedger(p.id).currentPayable })).filter(p => p.due > 0 && (!q || p.name.toLowerCase().includes(q) || (p.mobile || '').includes(q)));
  }, [type, customers, vendors, search, getCustomerLedger, getVendorLedger]);
  const totalDue = rows.reduce((s,r)=>s+r.due,0);
  const isCustomer = type === 'customer';
  const getPayableTransaction = (id: string) => {
    const ledger = isCustomer ? getCustomerLedger(id) : getVendorLedger(id);
    return ledger.transactions.find(t => isCustomer ? t.customerDue > 0 : t.vendorDue > 0) || null;
  };
  const getOpeningBalance = (id: string) => {
    if (type === 'customer') return Number(getCustomerLedger(id).customer?.openingDue || 0);
    return Number(getVendorLedger(id).vendor?.openingPayable || 0);
  };
  return <div className="space-y-5">
    <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900">{isCustomer ? 'Customer Due Payment' : 'Vendor Due Payment'}</h1><p className="text-xs text-slate-500 mt-1">Search, open statement, then record full or partial payment.</p></div>
    <div className="grid grid-cols-2 gap-3"><div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Due Accounts</div><div className="text-xl font-bold">{rows.length}</div></div><div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Total Due</div><div className={`text-xl font-bold ${isCustomer?'text-rose-600':'text-amber-700'}`}>{formatCurrency(totalDue)}</div></div></div>
    <div className="bg-white border rounded-xl p-4"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isCustomer?'Search customer name or mobile...':'Search vendor name or mobile...'} className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/></div></div>
    <div className="bg-white border rounded-xl overflow-hidden"><table className="w-full text-xs"><thead className="bg-slate-50 border-b"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Mobile</th><th className="text-right p-3">Outstanding Due</th><th className="text-right p-3">Action</th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3 font-semibold">{r.name}</td><td className="p-3 text-slate-500">{r.mobile||'—'}</td><td className={`p-3 text-right font-bold ${isCustomer?'text-rose-600':'text-amber-700'}`}>{formatCurrency(r.due)}</td><td className="p-3 text-right"><div className="inline-flex items-center gap-2"><button onClick={()=>setStatementId(r.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg"><FileText className="w-3.5 h-3.5"/> Statement</button><button onClick={()=>{const opening=getOpeningBalance(r.id); const partyTx=getPayableTransaction(r.id); if(opening>0){setOpeningPayment({id:r.id,name:r.name,amount:opening});setAmount(opening);} else if(partyTx) onOpenPayment(partyTx,type); else setStatementId(r.id);}} className={`px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg ${isCustomer?'bg-emerald-600 hover:bg-emerald-700':'bg-amber-600 hover:bg-amber-700'}`}>{isCustomer ? 'Pay Customer Due' : 'Pay Vendor Due'}</button></div></td></tr>)}
      {!rows.length&&<tr><td colSpan={4} className="p-10 text-center text-slate-400">No outstanding due accounts found.</td></tr>}
    </tbody></table></div>
    {openingPayment&&<div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between"><div><div className="text-[10px] text-slate-400 uppercase">Opening Balance Settlement</div><div className="font-bold">{openingPayment.name}</div></div><button onClick={()=>setOpeningPayment(null)}>✕</button></div>
      <form className="p-5 space-y-4" onSubmit={async e=>{e.preventDefault();const value=Number(amount);if(!Number.isFinite(value)||value<=0||value>openingPayment.amount)return alert("Enter a valid amount.");setSaving(true);try{const now=new Date();const paidAt=now.toLocaleString("sv-SE",{timeZone:"Asia/Dhaka"}).replace(" ","T")+":00+06:00";await api.recordOpeningBalancePayment({type,id:openingPayment.id,amount:value,paymentMethod:method,note:"Opening balance settlement",reference:`Opening ${isCustomer?"Due":"Payable"}`,paidAt});setOpeningPayment(null);window.location.reload();}catch(err){alert(err instanceof Error?err.message:"Payment failed");}finally{setSaving(false);}}}>
        <div className="rounded-xl bg-slate-50 border p-3 text-xs flex justify-between"><span>Outstanding</span><b>{formatCurrency(openingPayment.amount)}</b></div>
        <input type="number" min="1" max={openingPayment.amount} value={amount} onChange={e=>setAmount(e.target.value===""?"":Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg font-bold" required/>
        <div className="flex gap-3 text-[11px]"><button type="button" onClick={()=>setAmount(openingPayment.amount)} className="text-blue-600">Full Settlement</button><button type="button" onClick={()=>setAmount(Math.round(openingPayment.amount/2))} className="text-slate-600">50% Partial</button></div>
        <select value={method} onChange={e=>setMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 border rounded-lg text-xs"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select>
        <div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={()=>setOpeningPayment(null)} className="px-3 py-2 text-xs">Cancel</button><button disabled={saving} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg">{saving?"Saving…":isCustomer?"Receive & Settle":"Pay & Settle"}</button></div>
      </form></div></div>}
    {statementId&&isCustomer&&<CustomerLedgerModal customerId={statementId} onClose={()=>setStatementId(null)} onSelectTransaction={onSelectTransaction} onOpenPayment={tx=>{setStatementId(null);onOpenPayment(tx,'customer')}}/>}
    {statementId&&!isCustomer&&<VendorLedgerModal vendorId={statementId} onClose={()=>setStatementId(null)} onSelectTransaction={onSelectTransaction} onOpenPayment={tx=>{setStatementId(null);onOpenPayment(tx,'vendor')}}/>}
  </div>;
};