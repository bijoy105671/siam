import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Pencil, Plus, Trash2, X, SlidersHorizontal, RotateCcw, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LoanAdvanceDirection, LoanAdvanceKind, LoanAdvancePartyType, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const LoanAdvanceManager: React.FC = () => {
  const { customers, vendors, loanAdvances, loanAdvanceAdjustments, transactions, addLoanAdvance, addLoanAdvanceAsync, updateLoanAdvance, updateLoanAdvanceAsync, deleteLoanAdvance, deleteLoanAdvanceAsync, adjustLoanAdvance, adjustLoanAdvanceAsync, deleteLoanAdvanceAdjustment, deleteLoanAdvanceAdjustmentAsync, addCustomerAsync, addVendorAsync } = useApp();
  const [partyType, setPartyType] = useState<LoanAdvancePartyType>('customer');
  const [partyId, setPartyId] = useState('');
  const [kind, setKind] = useState<LoanAdvanceKind>('advance');
  const [direction, setDirection] = useState<LoanAdvanceDirection>('received');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState<'customer' | 'vendor' | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileNid, setProfileNid] = useState('');
  const [profilePassport, setProfilePassport] = useState('');
  const [profilePassportExpiry, setProfilePassportExpiry] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileAccountInfo, setProfileAccountInfo] = useState('');
  const [profileOpeningBalance, setProfileOpeningBalance] = useState<number | ''>(0);
  const [partySearch, setPartySearch] = useState('');

  const openProfileModal = (type: 'customer' | 'vendor') => {
    setProfileModal(type);
    setProfileName(''); setProfileMobile(''); setProfileWhatsapp(''); setProfileEmail('');
    setProfileAddress(''); setProfileNid(''); setProfilePassport(''); setProfilePassportExpiry('');
    setProfileCompany(''); setProfileAccountInfo(''); setProfileOpeningBalance(0);
  };
  const closeProfileModal = () => setProfileModal(null);
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) { alert('Name is required.'); return; }
    if (profileModal === 'customer') {
      const created = await addCustomerAsync({
        name: profileName.trim(), mobile: profileMobile.trim(),
        whatsapp: profileWhatsapp.trim() || profileMobile.trim(), email: profileEmail.trim(),
        address: profileAddress.trim(), nid: profileNid.trim(),
        passportNumber: profilePassport.trim(), passportExpiry: profilePassportExpiry || undefined,
        openingDue: Number(profileOpeningBalance) || 0,
      });
      setPartyType('customer'); setPartyId(created.id);
    } else if (profileModal === 'vendor') {
      const created = await addVendorAsync({
        name: profileName.trim(), company: profileCompany.trim(), mobile: profileMobile.trim(),
        whatsapp: profileWhatsapp.trim() || profileMobile.trim(), email: profileEmail.trim(),
        address: profileAddress.trim(), accountInfo: profileAccountInfo.trim(),
        openingPayable: Number(profileOpeningBalance) || 0,
      });
      setPartyType('vendor'); setPartyId(created.id);
    }
    closeProfileModal();
  };

  const parties = partyType === 'customer' ? customers : vendors;
  const selectedParty = parties.find((p) => p.id === partyId);

  const reset = () => {
    setPartyId(''); setKind('advance'); setDirection('received'); setAmount('');
    setPaymentMethod('Cash'); setNote(''); setReference(''); setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!partyId || !selectedParty || value <= 0) {
      alert('Please select a customer/vendor and enter a valid amount.');
      return;
    }
    const now = new Date();
    const payload = {
      partyType, partyId, partyName: selectedParty.name, kind, direction, amount: value,
      paymentMethod, date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5),
      note: note.trim() || undefined, reference: reference.trim() || undefined,
    };
    try {
      if (editingId) await updateLoanAdvanceAsync(editingId, payload);
      else await addLoanAdvanceAsync(payload);
      reset();
    } catch (err) { alert(err instanceof Error ? err.message : 'Could not save loan/advance.'); }
  };

  const startEdit = (id: string) => {
    const r = loanAdvances.find((x) => x.id === id);
    if (!r) return;
    const alreadyAdjusted = adjustedAmount(r.id);
    if (alreadyAdjusted > 0) {
      alert('This loan/advance already has settlement adjustments. Reverse those adjustments first, then edit the original entry.');
      return;
    }
    setEditingId(r.id); setPartyType(r.partyType); setPartyId(r.partyId); setKind(r.kind);
    setDirection(r.direction); setAmount(r.amount); setPaymentMethod(r.paymentMethod);
    setNote(r.note || ''); setReference(r.reference || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const partyBalances = useMemo(() => {
    const map: Record<string, number> = {};
    loanAdvances.forEach((r) => {
      const sign = r.direction === 'received' ? 1 : -1;
      const key = r.partyType + ':' + r.partyId;
      map[key] = (map[key] || 0) + sign * r.amount;
    });
    return map;
  }, [loanAdvances]);

  const adjustedAmount = (id: string) => (loanAdvanceAdjustments || [])
    .filter(a => a.loanAdvanceId === id)
    .reduce((sum, a) => sum + a.amount, 0);

  const getAvailable = (id: string) => {
    const r = loanAdvances.find(x => x.id === id);
    return r ? Math.max(0, r.amount - adjustedAmount(id)) : 0;
  };

  const adjustmentRows = useMemo(() => [...(loanAdvanceAdjustments || [])].sort((a, b) => {
    const aa = a.date + ' ' + a.time;
    const bb = b.date + ' ' + b.time;
    return bb.localeCompare(aa);
  }), [loanAdvanceAdjustments]);

  const handleAdjust = (loanAdvanceId: string) => {
    const record = loanAdvances.find((r) => r.id === loanAdvanceId);
    if (!record) return;
    const available = getAvailable(loanAdvanceId);
    if (available <= 0) {
      alert('This loan/advance has no remaining amount available for adjustment.');
      return;
    }

    const candidates = transactions.filter((t) =>
      record.partyType === 'customer'
        ? t.customerId === record.partyId && t.customerDue > 0
        : t.vendorId === record.partyId && t.vendorDue > 0
    );
    if (!candidates.length) {
      alert('No unpaid transaction/due was found for this party.');
      return;
    }

    const list = candidates.map((t, i) => {
      const due = record.partyType === 'customer' ? t.customerDue : t.vendorDue;
      return (i + 1) + '. ' + t.invoiceNumber + ' — Due ৳' + due;
    }).join('\n');

    const selected = window.prompt(
      'Select invoice number to adjust against:\n\n' + list +
      '\n\nEnter 1-' + candidates.length + ':',
      '1'
    );
    if (selected === null) return;

    const index = Number(selected) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
      alert('Invalid invoice selection.');
      return;
    }

    const tx = candidates[index];
    const due = record.partyType === 'customer' ? tx.customerDue : tx.vendorDue;
    const rawAmount = window.prompt(
      'Available from this ' + record.kind + ': ৳' + available +
      '\nInvoice due: ৳' + due + '\n\nEnter adjustment amount:',
      String(Math.min(available, due))
    );
    if (rawAmount === null) return;

    const value = Number(rawAmount);
    if (!Number.isFinite(value) || value <= 0) {
      alert('Enter a valid adjustment amount.');
      return;
    }

    const noteValue = window.prompt('Adjustment note (optional):', '') || undefined;
    adjustLoanAdvanceAsync(loanAdvanceId, tx.id, value, noteValue).then(() => alert('Loan / Advance adjusted successfully.')).catch(err => alert(err instanceof Error ? err.message : 'Adjustment could not be completed.'));
  };

  const totals = useMemo(() => {
    const received = loanAdvances.filter(r => r.direction === 'received').reduce((s, r) => s + r.amount, 0);
    const given = loanAdvances.filter(r => r.direction === 'given').reduce((s, r) => s + r.amount, 0);
    return { received, given, outstanding: received - given };
  }, [loanAdvances]);

  const partyAccountRows = useMemo(() => {
    const map: Record<string, { partyType: LoanAdvancePartyType; partyId: string; name: string; mobile: string; received: number; given: number }> = {};
    loanAdvances.forEach(r => {
      const key = r.partyType + ':' + r.partyId;
      if (!map[key]) map[key] = { partyType:r.partyType, partyId:r.partyId, name:r.partyName, mobile:'', received:0, given:0 };
      if (r.direction === 'received') map[key].received += r.amount;
      else map[key].given += r.amount;
    });
    const q = partySearch.trim().toLowerCase();
    return Object.values(map).filter(r => !q || r.name.toLowerCase().includes(q) || r.mobile.includes(q));
  }, [loanAdvances, partySearch]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Loan & Advance</h1>
        <p className="text-xs text-slate-500 mt-1">Record advances and loans separately from sales, expenses and profit.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div>
          <div className="font-bold text-sm text-slate-900">Loan / Advance Account Search</div>
          <div className="text-[11px] text-slate-500">Search a customer/vendor and use the account directly for payment or settlement.</div>
        </div>
        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={partySearch} onChange={e=>setPartySearch(e.target.value)} placeholder="Search customer or vendor..." className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
        <div className="divide-y border rounded-xl overflow-hidden">
          {partyAccountRows.map(r => {
            const net = r.received - r.given;
            return <div key={r.partyType+':'+r.partyId} className="p-3 flex items-center justify-between gap-3">
              <div><div className="font-semibold text-xs">{r.name}</div><div className="text-[10px] text-slate-400">{r.partyType} · Received {formatCurrency(r.received)} · Given {formatCurrency(r.given)}</div></div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-700">{formatCurrency(Math.abs(net))} {net >= 0 ? 'credit' : 'due'}</span><button type="button" onClick={()=>{setPartyType(r.partyType);setPartyId(r.partyId);window.scrollTo({top:0,behavior:'smooth'});}} className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-lg">Payment</button><button type="button" disabled={!loanAdvances.some(x=>x.partyType===r.partyType&&x.partyId===r.partyId&&getAvailable(x.id)>0)} onClick={()=>{const source=[...loanAdvances].reverse().find(x=>x.partyType===r.partyType&&x.partyId===r.partyId&&getAvailable(x.id)>0); if(source) handleAdjust(source.id);}} className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Settle Balance</button></div>
            </div>;
          })}
          {!partyAccountRows.length && <div className="p-6 text-center text-slate-400 text-xs">No loan/advance account found.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100"><div className="text-[11px] text-emerald-700">Received</div><div className="text-xl font-bold text-emerald-700">{formatCurrency(totals.received)}</div></div>
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100"><div className="text-[11px] text-rose-700">Given</div><div className="text-xl font-bold text-rose-700">{formatCurrency(totals.given)}</div></div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100"><div className="text-[11px] text-blue-700">Net Outstanding</div><div className="text-xl font-bold text-blue-700">{formatCurrency(totals.outstanding)}</div></div>
      </div>

      <form onSubmit={handleSave} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="font-bold text-sm text-slate-900">{editingId ? 'Edit Loan / Advance' : 'New Loan / Advance Entry'}</div>
          {editingId && <button type="button" onClick={reset} className="text-xs text-slate-500 flex items-center gap-1"><X className="w-3.5 h-3.5"/>Cancel</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className="block text-xs font-medium mb-1">Party</label><select value={partyType} onChange={e => {setPartyType(e.target.value as LoanAdvancePartyType);setPartyId('')}} className="w-full px-3 py-2 text-xs border rounded-lg"><option value="customer">Customer</option><option value="vendor">Vendor</option></select></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium">{partyType === 'customer' ? 'Customer' : 'Vendor'}</label>
              <button type="button" onClick={() => openProfileModal(partyType)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Add {partyType === 'customer' ? 'Customer' : 'Vendor'}</button>
            </div>
            <select required value={partyId} onChange={e => setPartyId(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg">
              <option value="">Select {partyType}</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}{'mobile' in p && p.mobile ? ' — ' + p.mobile : ''}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Type</label><select value={kind} onChange={e => setKind(e.target.value as LoanAdvanceKind)} className="w-full px-3 py-2 text-xs border rounded-lg"><option value="advance">Advance Payment</option><option value="loan">Loan</option></select></div>
          <div><label className="block text-xs font-medium mb-1">Direction</label><select value={direction} onChange={e => setDirection(e.target.value as LoanAdvanceDirection)} className="w-full px-3 py-2 text-xs border rounded-lg"><option value="received">Received (+ Account)</option><option value="given">Given (- Account)</option></select></div>
          <div><label className="block text-xs font-medium mb-1">Amount (৳)</label><input required min="0" type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 text-base font-bold border rounded-lg" placeholder="0"/></div>
          <div><label className="block text-xs font-medium mb-1">Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 text-xs border rounded-lg"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select></div>
          <div><label className="block text-xs font-medium mb-1">Reference</label><input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" placeholder="Optional"/></div>
          <div><label className="block text-xs font-medium mb-1">Note</label><input value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" placeholder="Optional note"/></div>
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold">{editingId ? <CheckCircle2 className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}{editingId ? 'Update Entry' : 'Save Loan / Advance'}</button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm">Loan & Advance History</div>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead className="bg-slate-50"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Party</th><th className="text-left p-3">Type</th><th className="text-left p-3">Direction</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Method</th><th className="text-right p-3">Available</th><th className="text-right p-3">Action</th></tr></thead>
          <tbody>{loanAdvances.map(r => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="p-3 whitespace-nowrap">{r.date}<div className="text-[10px] text-slate-400">{r.time}</div></td>
              <td className="p-3 font-semibold">{r.partyName}<div className="text-[10px] text-slate-400">{r.partyType}</div></td>
              <td className="p-3">{r.kind === 'advance' ? 'Advance' : 'Loan'}</td>
              <td className="p-3">{r.direction === 'received' ? <span className="text-emerald-600 flex items-center gap-1"><ArrowDownLeft className="w-3.5 h-3.5"/>Received</span> : <span className="text-rose-600 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5"/>Given</span>}</td>
              <td className="p-3 text-right font-bold">{formatCurrency(r.amount)}</td><td className="p-3">{r.paymentMethod}</td>
              <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(getAvailable(r.id))}</td>
              <td className="p-3 text-right whitespace-nowrap"><button onClick={() => handleAdjust(r.id)} title="Adjust / Settle against due" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><SlidersHorizontal className="w-3.5 h-3.5"/></button><button onClick={() => startEdit(r.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5"/></button><button onClick={() => {if(confirm(getAvailable(r.id) < r.amount ? 'This entry has adjustments. Reverse the adjustments first, then delete it.' : 'Delete this loan/advance entry?') && getAvailable(r.id) === r.amount) deleteLoanAdvance(r.id)}} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button></td>
            </tr>
          ))}{!loanAdvances.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">No loan or advance records yet.</td></tr>}</tbody>
        </table></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm">Adjustment / Settlement History</div>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead className="bg-slate-50"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Party</th><th className="text-left p-3">Invoice</th><th className="text-right p-3">Adjusted</th><th className="text-left p-3">Note</th><th className="text-right p-3">Action</th></tr></thead>
          <tbody>{adjustmentRows.map(a => {
            const tx = transactions.find(t => t.id === a.transactionId);
            const party = a.partyType === 'customer' ? customers.find(p => p.id === a.partyId) : vendors.find(p => p.id === a.partyId);
            return <tr key={a.id} className="border-t border-slate-100">
              <td className="p-3 whitespace-nowrap">{a.date}<div className="text-[10px] text-slate-400">{a.time}</div></td>
              <td className="p-3 font-semibold">{party?.name || a.partyId}</td>
              <td className="p-3">{tx?.invoiceNumber || a.transactionId}</td>
              <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(a.amount)}</td>
              <td className="p-3 text-slate-500">{a.note || '—'}</td>
              <td className="p-3 text-right"><button onClick={() => { if (confirm('Reverse this adjustment? No cash will be moved.')) void deleteLoanAdvanceAdjustmentAsync(a.id).catch(err => alert(err instanceof Error ? err.message : 'Adjustment reversal failed')); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reverse adjustment"><RotateCcw className="w-3.5 h-3.5"/></button></td>
            </tr>;
          })}{!adjustmentRows.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No adjustments yet.</td></tr>}</tbody>
        </table></div>
      </div>

      {profileModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div><h3 className="font-bold text-sm">Add {profileModal === 'customer' ? 'Customer' : 'Vendor'} Profile</h3><p className="text-[10px] text-slate-300 mt-0.5">Saved to the main list and selected here automatically.</p></div>
              <button type="button" onClick={closeProfileModal} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={saveProfile} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1">Name *</label><input required value={profileName} onChange={e=>setProfileName(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                {profileModal === 'vendor' && <div><label className="block text-xs font-medium mb-1">Company</label><input value={profileCompany} onChange={e=>setProfileCompany(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>}
                <div><label className="block text-xs font-medium mb-1">Mobile</label><input value={profileMobile} onChange={e=>setProfileMobile(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                <div><label className="block text-xs font-medium mb-1">WhatsApp</label><input value={profileWhatsapp} onChange={e=>setProfileWhatsapp(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                <div><label className="block text-xs font-medium mb-1">Email</label><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                <div><label className="block text-xs font-medium mb-1">{profileModal === 'customer' ? 'Opening Due' : 'Opening Payable'} (৳)</label><input type="number" min="0" value={profileOpeningBalance} onChange={e=>setProfileOpeningBalance(e.target.value===''?'':Number(e.target.value))} className="w-full px-3 py-2 text-xs font-bold border rounded-lg"/></div>
                <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1">Address</label><input value={profileAddress} onChange={e=>setProfileAddress(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                {profileModal === 'customer' ? <>
                  <div><label className="block text-xs font-medium mb-1">NID</label><input value={profileNid} onChange={e=>setProfileNid(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                  <div><label className="block text-xs font-medium mb-1">Passport Number</label><input value={profilePassport} onChange={e=>setProfilePassport(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                  <div><label className="block text-xs font-medium mb-1">Passport Expiry</label><input type="date" value={profilePassportExpiry} onChange={e=>setProfilePassportExpiry(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>
                </> : <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1">Bank / Account Info</label><input value={profileAccountInfo} onChange={e=>setProfileAccountInfo(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg"/></div>}
              </div>
              <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={closeProfileModal} className="px-4 py-2 text-xs rounded-lg border text-slate-600">Cancel</button><button type="submit" className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save & Select</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="font-semibold text-xs mb-2">Party Net Position</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(partyBalances).map(([id, balance]) => {
            const [type, partyId] = id.split(':');
            const party = type === 'customer' ? customers.find(p => p.id === partyId) : vendors.find(p => p.id === partyId);
            return party ? <div key={id} className="bg-white border rounded-lg p-3 text-xs flex justify-between"><span>{party.name}</span><span className={balance >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{formatCurrency(balance)}</span></div> : null;
          })}
        </div>
      </div>
    </div>
  );
};
