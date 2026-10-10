import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Save, Plane, Hotel } from 'lucide-react';
import { apiRequest } from '../../services/apiClient';

type TravelRequest = {
  id: string; reference: string; service_type: 'flight'|'hotel'; customer_name: string; email: string; phone: string; whatsapp?: string;
  details: Record<string, any>; document_type?: string; document_name?: string; has_document: boolean; status: string;
  quoted_amount?: number|null; currency: string; carrier_type?: string|null; admin_note?: string|null;
  payment_reference?: string|null; ticket_reference?: string|null; created_at: string; updated_at: string;
};
const statuses = ['QUOTE_PENDING','QUOTED','PAYMENT_PENDING','PAYMENT_VERIFIED','BOOKED','TICKET_UPLOADED','COMPLETED','CANCELLED'];
const money = (value: unknown) => value == null || value === '' ? '' : String(value);

export const EcommerceTravelRequests: React.FC = () => {
  const [rows,setRows]=useState<TravelRequest[]>([]);
  const [drafts,setDrafts]=useState<Record<string,any>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=async()=>{setBusy(true);setError('');try{const data=await apiRequest<TravelRequest[]>('/api/storefront/flight-requests');setRows(data);setDrafts(old=>{const next={...old};for(const r of data)if(!next[r.id])next[r.id]={status:r.status,quotedAmount:money(r.quoted_amount),adminNote:r.admin_note||'',paymentReference:r.payment_reference||'',ticketReference:r.ticket_reference||''};return next;});}catch(e){setError(e instanceof Error?e.message:'Travel requests could not be loaded.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const save=async(r:TravelRequest)=>{const d=drafts[r.id]||{};setBusy(true);setError('');setNotice('');try{await apiRequest('/api/storefront/flight-requests/'+encodeURIComponent(r.id),{method:'PATCH',body:JSON.stringify({status:d.status,quotedAmount:d.quotedAmount===''?null:Number(d.quotedAmount),adminNote:d.adminNote,paymentReference:d.paymentReference,ticketReference:d.ticketReference})});setNotice('Saved '+r.reference+'. E-commerce request only; accounting balances are unchanged.');await load();}catch(e){setError(e instanceof Error?e.message:'Could not save this request.');}finally{setBusy(false);}};
  const download=async(r:TravelRequest)=>{try{const response=await fetch('/api/storefront/flight-requests/'+encodeURIComponent(r.id)+'/document',{credentials:'include'});if(!response.ok){const j=await response.json().catch(()=>({}));throw new Error(j.error||'Document download failed.');}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=r.document_name||('travel-document-'+r.reference);a.click();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Unable to download document.');}};
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">E-commerce Travel Requests</h2><p className="mt-1 text-sm text-slate-500">Quote and booking workflow. These requests never change the accounting ledger automatically.</p></div><button onClick={()=>void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{busy?'Loading…':'Refresh'}</button></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    {!rows.length&&!busy&&<div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No travel quote requests found yet.</div>}
    <div className="space-y-4">{rows.map(r=>{const d=drafts[r.id]||{status:r.status,quotedAmount:money(r.quoted_amount),adminNote:r.admin_note||'',paymentReference:r.payment_reference||'',ticketReference:r.ticket_reference||''};return <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-sky-50 p-2 text-sky-800">{r.service_type==='flight'?<Plane className="h-5 w-5"/>:<Hotel className="h-5 w-5"/>}</div><div><h3 className="font-black text-slate-900">{r.reference} · {r.service_type==='flight'?'Flight':'Hotel'}</h3><p className="mt-1 text-sm font-semibold text-slate-800">{r.customer_name}</p><p className="text-sm text-slate-500">{r.phone} · {r.email}{r.whatsapp?' · WhatsApp '+r.whatsapp:''}</p><p className="mt-1 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{r.status}</span></div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>Request details</b><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs">{JSON.stringify(r.details,null,2)}</pre>{r.carrier_type==='LEGACY_CARRIER'&&<p className="mt-2 font-bold text-sky-800">Legacy Carrier commission rule: 7% only; verify fare before quote.</p>}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">{r.has_document?<button onClick={()=>void download(r)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><Download className="h-4 w-4"/>Download encrypted document</button>:<span className="text-xs text-slate-500">No document attached</span>}<span className="text-xs text-slate-500">Documents are sensitive. Download only when required and store securely.</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-bold text-slate-600">Status<select value={d.status} onChange={e=>setDrafts(old=>({...old,[r.id]:{...d,status:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">{statuses.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Verified quote amount (BDT)<input type="number" min="0" step="0.01" value={d.quotedAmount} onChange={e=>setDrafts(old=>({...old,[r.id]:{...d,quotedAmount:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"/></label>
        <label className="text-xs font-bold text-slate-600">Payment reference<input value={d.paymentReference} onChange={e=>setDrafts(old=>({...old,[r.id]:{...d,paymentReference:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"/></label>
        <label className="text-xs font-bold text-slate-600">Ticket / PNR reference<input value={d.ticketReference} onChange={e=>setDrafts(old=>({...old,[r.id]:{...d,ticketReference:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"/></label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Admin note<textarea value={d.adminNote} onChange={e=>setDrafts(old=>({...old,[r.id]:{...d,adminNote:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"/></label>
      </div>
      <div className="mt-4 flex justify-end"><button onClick={()=>void save(r)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-sky-800 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/>Save request</button></div>
    </article>;})}</div>
  </section>;
};
