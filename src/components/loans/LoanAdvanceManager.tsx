import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Pencil, Plus, Trash2, X, SlidersHorizontal, RotateCcw, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LoanAdvanceDirection, LoanAdvanceKind, LoanAdvancePartyType, PaymentMethod, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface LoanAdvanceManagerProps { onOpenPayment?: (tx: Transaction, type: 'customer' | 'vendor') => void; }

export const LoanAdvanceManager: React.FC<LoanAdvanceManagerProps> = ({ onOpenPayment }) => {
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [settlementId, setSettlementId] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number | ''>('');
  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>('Cash');
  const [settlementNote, setSettlementNote] = useState('Loan / Advance settlement');
  const [savingSettlement, setSavingSettlement] = useState(false);
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
    setPaymentMethod('Cash'); setNote(''); setReference(''); setEditingId(null); setEditModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!partyId || !selectedParty || value <= 0) {
      alert('Please select a customer/vendor and enter a valid amount.');
      return;
    }
    const now = new Date();
    const dhaka = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as Record<string, string>);
    const payload = {
      partyType, partyId, partyName: selectedParty.name, kind, direction, amount: value,
      paymentMethod, date: `${dhaka.year}-${dhaka.month}-${dhaka.day}`, time: `${dhaka.hour}:${dhaka.minute}`,
      note: note.trim() || undefined, reference: reference.trim() || undefined,
    };
    try {
      if (editingId) await updateLoanAdvanceAsync(editingId, payload);
      else await addLoanAdvanceAsync(payload);
      reset();
      setEditModalOpen(false);
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
    setEditModalOpen(true);
  };

  const partyBalances = useMemo(() => {
    const map: Record<string, number> = {};
    loanAdvances.forEach((r) => {
      const sign = r.direction === 'received' ? 1 : -1;
      const key = r.partyType + ':' + r.partyId;
      map[key] = (map[key] || 0) + sign * r.amount;
    });
    (loanAdvanceAdjustments || []).forEach((a) => {
      const key = a.partyType + ':' + a.partyId;
      if (map[key] === undefined) map[key] = 0;
      map[key] += a.partyType === 'customer' ? -a.amount : a.amount;
    });
    return map;
  }, [loanAdvances, loanAdvanceAdjustments]);

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

  const handleCashSettlement = (loanAdvanceId: string) => {
    const record = loanAdvances.find((r) => r.id === loanAdvanceId);
    if (!record) return;
    const available = getAvailable(loanAdvanceId);
    if (available <= 0) {
      alert('এই Loan/Advance-এর settle করার মতো অবশিষ্ট ব্যালেন্স নেই।');
      return;
    }
    setSettlementId(loanAdvanceId);
    setSettlementAmount(available);
    setSettlementMethod(record.paymentMethod);
    setSettlementNote('Loan / Advance settlement');
  };

  const saveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const record = loanAdvances.find((r) => r.id === settlementId);
    if (!record) return;
    const available = getAvailable(record.id);
    const value = Number(settlementAmount);
    if (!Number.isFinite(value) || value <= 0 || value > available) {
      alert('Amount অবশ্যই ০-এর বেশি এবং Available Balance-এর সমান বা কম হতে হবে।');
      return;
    }
    const now = new Date();
    const dhaka = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as Record<string, string>);
    setSavingSettlement(true);
    try {
      await addLoanAdvanceAsync({
        partyType: record.partyType,
        partyId: record.partyId,
        partyName: record.partyName,
        kind: record.kind,
        direction: record.direction === 'received' ? 'given' : 'received',
        amount: value,
        paymentMethod: settlementMethod,
        date: `${dhaka.year}-${dhaka.month}-${dhaka.day}`,
        time: `${dhaka.hour}:${dhaka.minute}`,
        note: settlementNote.trim() || 'Loan / Advance settlement',
        reference: record.reference || undefined,
      });
      setSettlementId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Settlement save করা যায়নি।');
    } finally { setSavingSettlement(false); }
  };

  const totals = useMemo(() => {
    const received = loanAdvances.filter(r => r.direction === 'received').reduce((s, r) => s + r.amount, 0);
    const given = loanAdvances.filter(r => r.direction === 'given').reduce((s, r) => s + r.amount, 0);
    return { received, given, outstanding: received - given };
  }, [loanAdvances]);

  const partyAccountRows = useMemo(() => {
    const map: Record<string, { partyType: LoanAdvancePartyType; partyId: string; name: string; mobile: string; received: number; given: number; adjusted: number }> = {};
    loanAdvances.forEach(r => {
      const key = r.partyType + ':' + r.partyId;
      const party = r.partyType === 'customer'
        ? customers.find(p => p.id === r.partyId)
        : vendors.find(p => p.id === r.partyId);
      if (!map[key]) map[key] = {
        partyType: r.partyType, partyId: r.partyId, name: r.partyName,
        mobile: party?.mobile || '', received: 0, given: 0, adjusted: 0
      };
      if (r.direction === 'received') map[key].received += r.amount;
      else map[key].given += r.amount;
    });
    (loanAdvanceAdjustments || []).forEach(a => {
      const key = a.partyType + ':' + a.partyId;
      if (!map[key]) {
        const party = a.partyType === 'customer'
          ? customers.find(p => p.id === a.partyId)
          : vendors.find(p => p.id === a.partyId);
        map[key] = { partyType:a.partyType, partyId:a.partyId, name:party?.name || a.partyId, mobile:party?.mobile || '', received:0, given:0, adjusted:0 };
      }
      map[key].adjusted += a.amount;
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
          <div className="text-[11px] text-slate-500">Search a customer/vendor and pay an outstanding invoice or settle an advance directly from the linked account.</div>
        </div>
        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={partySearch} onChange={e=>setPartySearch(e.target.value)} placeholder="Search customer or vendor..." className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
        <div className="divide-y border rounded-xl overflow-hidden">
          {partyAccountRows.map(r => {
            const net = r.partyType === 'customer'
              ? r.received - r.given - r.adjusted
              : r.received - r.given + r.adjusted;
            return <div key={r.partyType+':'+r.partyId} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0"><div className="font-semibold text-xs truncate">{r.name}</div><div className="text-[10px] text-slate-400">{r.partyType} · {r.mobile || 'No mobile'} · Received {formatCurrency(r.received)} · Given {formatCurrency(r.given)} · Adjusted {formatCurrency(r.adjusted)}</div></div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-700">{formatCurrency(Math.abs(net))} {net >= 0 ? 'credit' : 'due'}</span><button type="button" onClick={() => {
                const dueTx = transactions.find(t => r.partyType === 'customer' ? t.customerId === r.partyId && t.customerDue > 0 : t.vendorId === r.partyId && t.vendorDue > 0);
                if (dueTx && onOpenPayment) onOpenPayment(dueTx, r.partyType);
                else alert('No outstanding invoice due found for this party.');
              }} disabled={!onOpenPayment || !transactions.some(t => r.partyType === 'customer' ? t.customerId === r.partyId && t.customerDue > 0 : t.vendorId === r.partyId && t.vendorDue > 0)} className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Pay Due</button><button type="button" disabled={!loanAdvances.some(x=>x.partyType===r.partyType&&x.partyId===r.partyId&&getAvailable(x.id)>0)} onClick={()=>{const source=[...loanAdvances].reverse().find(x=>x.partyType===r.partyType&&x.partyId===r.partyId&&getAvailable(x.id)>0); if(source) void handleCashSettlement(source.id);}} className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Settle Balance</button></div>
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
              <td className="p-3 text-right whitespace-nowrap">
                <div className="inline-flex flex-wrap justify-end gap-1">
                  <button type="button" disabled={getAvailable(r.id)<=0} onClick={() => void handleCashSettlement(r.id)} title="Record actual repayment or refund" className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"><SlidersHorizontal className="w-3.5 h-3.5"/><span>Settle</span></button>
                  <button type="button" disabled={(r.partyType==='customer'&&r.direction!=='received')||(r.partyType==='vendor'&&r.direction!=='given')||getAvailable(r.id)<=0} onClick={() => handleAdjust(r.id)} title="Apply advance to an outstanding invoice" className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"><span>Apply Due</span></button>
                  <button type="button" onClick={() => startEdit(r.id)} title="Edit loan / advance" className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"><Pencil className="w-3.5 h-3.5"/><span>Edit</span></button>
                  <button type="button" onClick={async () => {
                    if (getAvailable(r.id) < r.amount) {
                      alert('This entry has settlement adjustments. Reverse those adjustments first, then delete it.');
                      return;
                    }
                    if (!confirm('Delete this loan/advance entry? This will also update its account balance.')) return;
                    try { await deleteLoanAdvanceAsync(r.id); }
                    catch (err) { alert(err instanceof Error ? err.message : 'Loan/advance delete failed. Please try again.'); }
                  }} title="Delete loan / advance" className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded"><Trash2 className="w-3.5 h-3.5"/><span>Delete</span></button>
                </div>
              </td>
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
              <td className="p-3 text-right"><button type="button" onClick={async () => {
                if (!confirm('Reverse this adjustment? The original invoice due will be restored; no cash will be moved.')) return;
                try { await deleteLoanAdvanceAdjustmentAsync(a.id); }
                catch (err) { alert(err instanceof Error ? err.message : 'Adjustment reversal failed. Please try again.'); }
              }} className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded" title="Reverse adjustment"><RotateCcw className="w-3.5 h-3.5"/><span>Reverse</span></button></td>
            </tr>;
          })}{!adjustmentRows.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No adjustments yet.</td></tr>}</tbody>
        </table></div>
      </div>

      {editModalOpen && editingId && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 sm:p-5 flex items-center justify-between">
              <div><div className="flex items-center gap-2 text-sm font-bold"><Pencil className="w-4 h-4"/> Edit Loan / Advance</div><p className="text-[11px] text-blue-100 mt-1">Amount, payment method and entry details update here.</p></div>
              <button type="button" onClick={() => { setEditModalOpen(false); reset(); }} className="p-2 rounded-lg hover:bg-white/15" aria-label="Close edit"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold mb-1">Party Type</label><select value={partyType} onChange={e=>{setPartyType(e.target.value as LoanAdvancePartyType);setPartyId('')}} className="w-full border rounded-xl p-3 text-sm"><option value="customer">Customer</option><option value="vendor">Vendor</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Customer / Vendor</label><select required value={partyId} onChange={e=>setPartyId(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="">Select party</option>{parties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1">Entry Type</label><select value={kind} onChange={e=>setKind(e.target.value as LoanAdvanceKind)} className="w-full border rounded-xl p-3 text-sm"><option value="advance">Advance</option><option value="loan">Loan</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Direction</label><select value={direction} onChange={e=>setDirection(e.target.value as LoanAdvanceDirection)} className="w-full border rounded-xl p-3 text-sm"><option value="received">Received (+ Account)</option><option value="given">Given (- Account)</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Amount (৳)</label><input required min="0.01" step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value===''?'':Number(e.target.value))} className="w-full border rounded-xl p-3 text-base font-bold"/></div>
                <div><label className="block text-xs font-semibold mb-1">Payment Method</label><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as PaymentMethod)} className="w-full border rounded-xl p-3 text-sm"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Reference</label><input value={reference} onChange={e=>setReference(e.target.value)} className="w-full border rounded-xl p-3 text-sm" placeholder="Optional reference"/></div>
                <div><label className="block text-xs font-semibold mb-1">Note</label><input value={note} onChange={e=>setNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm" placeholder="Optional note"/></div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Amount বা method পরিবর্তন করলে সংশ্লিষ্ট account balance-ও পুনরায় হিসাব হবে। এই এন্ট্রিতে আগে invoice adjustment থাকলে আগে adjustment reverse করতে হবে।</div>
              <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={()=>{setEditModalOpen(false);reset();}} className="px-4 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button><button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {settlementId && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {(() => { const record=loanAdvances.find(r=>r.id===settlementId); return <>
              <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white p-5 flex items-start justify-between">
                <div><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-5 h-5"/> Settle Loan / Advance</div><p className="text-xs text-emerald-100 mt-1">রিপেমেন্টের তথ্য দিন — browser notification নয়, এখানেই save হবে।</p></div>
                <button type="button" onClick={()=>setSettlementId(null)} className="p-1 rounded-lg hover:bg-white/15" aria-label="Close settlement"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={saveSettlement} className="p-5 space-y-4">
                <div className="rounded-xl border bg-slate-50 p-3"><div className="text-xs text-slate-500">Party</div><div className="font-bold text-slate-900">{record?.partyName || '—'}</div><div className="flex justify-between mt-3 text-xs"><span className="text-slate-500">Available to settle</span><strong className="text-emerald-700">{formatCurrency(record ? getAvailable(record.id) : 0)}</strong></div></div>
                <div><label className="block text-xs font-semibold mb-1">Settlement Amount (৳)</label><input required min="0.01" max={record ? getAvailable(record.id) : undefined} step="0.01" type="number" value={settlementAmount} onChange={e=>setSettlementAmount(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-xl border p-3 text-lg font-bold focus:ring-2 focus:ring-emerald-500 outline-none"/></div>
                <div><label className="block text-xs font-semibold mb-1">Payment Method</label><select value={settlementMethod} onChange={e=>setSettlementMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border p-3 text-sm"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select></div>
                <div><label className="block text-xs font-semibold mb-1">Note</label><input value={settlementNote} onChange={e=>setSettlementNote(e.target.value)} className="w-full rounded-xl border p-3 text-sm"/></div>
                <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={()=>setSettlementId(null)} className="px-4 py-2.5 rounded-xl border text-sm font-semibold" disabled={savingSettlement}>Cancel</button><button type="submit" disabled={savingSettlement} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold">{savingSettlement?'Saving…':'Confirm Settlement'}</button></div>
              </form>
            </>; })()}
          </div>
        </div>
      )}

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
