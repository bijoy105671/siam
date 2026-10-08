import React, { useState } from 'react';
import {
  Users, Search, Plus, FileText, PhoneCall, Edit, DollarSign, X, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { api } from '../../services/apiClient';

interface CustomerListProps {
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment?: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ onSelectTransaction, onOpenPayment }) => {
  const { customers, addCustomer, updateCustomer, getCustomerLedger, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [nid, setNid] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [facebook, setFacebook] = useState('');
  const [photo, setPhoto] = useState('');
  const [openingDue, setOpeningDue] = useState<number | ''>(0);
  const [sortBy, setSortBy] = useState<'name' | 'due_high' | 'due_low'>('due_high');

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q) ||
      (c.passportNumber && c.passportNumber.toLowerCase().includes(q)) ||
      (c.nid && c.nid.includes(q)) || (c.address && c.address.toLowerCase().includes(q));
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null); setName(''); setMobile(''); setWhatsapp(''); setEmail(''); setAddress('');
    setNid(''); setPassportNumber(''); setPassportExpiry(''); setNotes(''); setFacebook(''); setPhoto('');
    setOpeningDue(0); setIsModalOpen(true);
  };
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c); setName(c.name); setMobile(c.mobile); setWhatsapp(c.whatsapp || ''); setEmail(c.email || '');
    setAddress(c.address || ''); setNid(c.nid || ''); setPassportNumber(c.passportNumber || '');
    setPassportExpiry(c.passportExpiry || ''); setNotes(c.notes || ''); setFacebook(c.facebook || '');
    setPhoto(c.photo || ''); setOpeningDue(c.openingDue || 0); setIsModalOpen(true);
  };
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) { alert('Name and Mobile number are required.'); return; }
    const data = { name: name.trim(), mobile: mobile.trim(), whatsapp: whatsapp.trim() || mobile.trim(), email: email.trim(), address: address.trim(), nid: nid.trim(), passportNumber: passportNumber.trim().toUpperCase(), passportExpiry, notes: notes.trim(), facebook: facebook.trim(), photo, openingDue: Number(openingDue) || 0 };
    editingCustomer ? updateCustomer(editingCustomer.id, data) : addCustomer(data);
    setIsModalOpen(false);
  };

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-blue-600"/><span>Customers & Accounts Ledger</span></h1><p className="text-xs sm:text-sm text-slate-500">Customer Name & Contact — hover to view full information</p></div>
      <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"><Plus className="w-4 h-4"/><span>Add New Customer</span></button>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center gap-2"><Search className="w-4 h-4 text-slate-400"/><input type="text" placeholder="Search by name, mobile, passport number, NID, city..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"/>{searchQuery&&<button onClick={()=>setSearchQuery('')} className="text-xs text-slate-400">Clear</button>}</div>
    <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Due: per customer</span><select value={sortBy} onChange={e=>setSortBy(e.target.value as 'name'|'due_high'|'due_low')} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white font-semibold"><option value="due_high">Due: High → Low</option><option value="due_low">Due: Low → High</option><option value="name">Name: A → Z</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100"><tr><th className="py-3 px-4">Customer Name & Contact</th><th className="py-3 px-4 text-right">Total Sales</th><th className="py-3 px-4 text-right">Total Paid</th><th className="py-3 px-4 text-right">Opening Due</th><th className="py-3 px-4 text-right">Customer পাওনা</th><th className="py-3 px-4 text-right">Customer দেনা / Advance</th><th className="py-3 px-4 text-right">Ledger Actions</th></tr></thead><tbody className="divide-y divide-slate-100 font-mono">
      {filteredCustomers.length===0?<tr><td colSpan={7} className="py-12 text-center text-slate-400 font-sans">No customers found matching search criteria.</td></tr>:filteredCustomers.map(cust=>{const ledger=getCustomerLedger(cust.id);const hasDue=ledger.currentDue>0;return <tr key={cust.id} className={`group relative hover:bg-slate-50/70 transition-colors ${hasDue?'bg-rose-50/20':''}`}>
        <td className="py-3.5 px-4 font-sans relative"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border flex items-center justify-center">{cust.photo?<img src={cust.photo} alt="" className="w-full h-full object-cover"/>:<Users className="w-4 h-4 text-slate-300"/>}</div><div><div className="font-bold text-slate-900 text-sm">{cust.name}</div><div className="text-xs text-slate-500 font-mono">{cust.mobile}</div></div><div className="hidden group-hover:block absolute left-3 top-full z-50 mt-1 w-80 rounded-xl bg-slate-950 text-white p-3 shadow-2xl text-[11px] leading-5"><div className="font-bold text-sm mb-1">{cust.name}</div><div>Mobile: {cust.mobile}</div>{cust.whatsapp&&<div>WhatsApp: {cust.whatsapp}</div>}{cust.email&&<div>Email: {cust.email}</div>}{cust.facebook&&<div>Facebook: {cust.facebook}</div>}{cust.address&&<div>Address: {cust.address}</div>}{cust.passportNumber&&<div>Passport: {cust.passportNumber}{cust.passportExpiry?` · Exp ${cust.passportExpiry}`:''}</div>}{cust.nid&&<div>NID: {cust.nid}</div>}{cust.notes&&<div>Notes: {cust.notes}</div>}</div></td>
        <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(ledger.totalSales)}</td><td className="py-3.5 px-4 text-right font-semibold text-emerald-600 tabular-nums">{formatCurrency(ledger.totalPaid)}</td><td className="py-3.5 px-4 text-right text-slate-600 tabular-nums text-xs">{cust.openingDue>0?<span className="text-amber-700">{formatCurrency(cust.openingDue)}</span>:<span className="text-slate-400">৳0</span>}</td>
        <td className="py-3.5 px-4 text-right font-bold tabular-nums">{hasDue?<span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{formatCurrency(ledger.currentDue)}</span>:<span className="text-emerald-600 font-semibold">৳0</span>}</td><td className="py-3.5 px-4 text-right font-bold tabular-nums">{ledger.availableAdvance>0?<span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{formatCurrency(ledger.availableAdvance)}</span>:<span className="text-slate-400">৳0</span>}</td>
        <td className="py-3.5 px-4 text-right font-sans"><div className="flex items-center justify-end gap-1.5"><button onClick={()=>setSelectedCustomerId(cust.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg"><FileText className="w-3.5 h-3.5"/>Statement</button>{hasDue&&ledger.transactions.find(tx=>tx.customerDue>0)&&onOpenPayment&&<button onClick={()=>{const tx=ledger.transactions.find(item=>item.customerDue>0);if(tx)onOpenPayment(tx,'customer')}} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg"><DollarSign className="w-3.5 h-3.5"/>PAY</button>}{cust.mobile&&<a href={`tel:${cust.mobile}`} className="p-1.5 text-slate-500 rounded-lg" title="Call Customer"><PhoneCall className="w-3.5 h-3.5"/></a>}<button onClick={()=>handleOpenEdit(cust)} className="p-1.5 text-slate-500 rounded-lg" title="Edit Customer"><Edit className="w-3.5 h-3.5"/></button>{currentUser?.role==='admin'&&<button onClick={async()=>{if(!confirm(`Delete customer ${cust.name}? This is an admin-only action and requires security OTP.`))return;try{await api.deleteCustomer(cust.id);window.location.reload()}catch(error){alert(error instanceof Error?error.message:'Customer could not be deleted.')}}} className="p-1.5 text-slate-400 rounded-lg" title="Delete Customer (Admin + OTP)"><Trash2 className="w-3.5 h-3.5"/></button>}</div></td>
      </tr>})}</tbody></table></div></div>
    {selectedCustomerId&&<CustomerLedgerModal customerId={selectedCustomerId} onClose={()=>setSelectedCustomerId(null)} onSelectTransaction={onSelectTransaction} onOpenPayment={tx=>onOpenPayment?.(tx,'customer')}/>} 
    {isModalOpen&&<div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200"><div className="p-4 bg-slate-900 text-white flex items-center justify-between"><h3 className="font-bold text-sm">{editingCustomer?'Edit Customer Profile':'Add New Customer Profile'}</h3><button onClick={()=>setIsModalOpen(false)}><X className="w-5 h-5"/></button></div><form onSubmit={handleSaveCustomer} className="p-5 space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-700 mb-1">Customer Name *</label><input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number *</label><input required value={mobile} onChange={e=>setMobile(e.target.value)} className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Passport Number</label><input value={passportNumber} onChange={e=>setPassportNumber(e.target.value.toUpperCase())} className="w-full px-3 py-1.5 text-xs font-mono border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Passport Expiry Date</label><input type="date" value={passportExpiry} onChange={e=>setPassportExpiry(e.target.value)} className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">National ID (NID)</label><input value={nid} onChange={e=>setNid(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Opening Balance Due (৳)</label><input type="number" min="0" value={openingDue} onChange={e=>setOpeningDue(e.target.value===''?'':Number(e.target.value))} className="w-full px-3 py-1.5 text-xs font-mono border rounded-lg"/></div></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Address</label><input value={address} onChange={e=>setAddress(e.target.value)} className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-700 mb-1">Facebook Account / Profile</label><input value={facebook} onChange={e=>setFacebook(e.target.value)} placeholder="Facebook URL / profile name" className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Customer Photo</label><input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result||''));reader.readAsDataURL(file)}}} className="w-full text-xs"/></div></div><div><label className="block text-xs font-medium text-slate-700 mb-1">Notes</label><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full px-3 py-1.5 text-xs border rounded-lg"/></div><div className="pt-3 flex justify-between border-t"><button type="button" onClick={handleOpenAdd} className="px-3 py-1.5 text-xs text-rose-600 border rounded-lg">Clear Fields</button><div className="flex gap-2"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-3.5 py-1.5 text-xs">Cancel</button><button type="submit" className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg">Save Customer Profile</button></div></div></form></div></div>}
  </div>;
};