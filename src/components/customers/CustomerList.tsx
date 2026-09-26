import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  FileText,
  PhoneCall,
  MessageSquare,
  Edit,
  DollarSign,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Transaction } from '../../types';
import { formatCurrency, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { api } from '../../services/apiClient';

interface CustomerListProps {
  onSelectTransaction: (tx: Transaction) => void;
  onOpenPayment?: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ onSelectTransaction, onOpenPayment }) => {
  const { customers, addCustomer, updateCustomer, getCustomerLedger, settings, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Add/Edit customer modal
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
  const [openingDue, setOpeningDue] = useState<number | ''>(0);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.passportNumber && c.passportNumber.toLowerCase().includes(q)) ||
      (c.nid && c.nid.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setNid('');
    setPassportNumber('');
    setPassportExpiry('');
    setNotes('');
    setOpeningDue(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setMobile(c.mobile);
    setWhatsapp(c.whatsapp || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setNid(c.nid || '');
    setPassportNumber(c.passportNumber || '');
    setPassportExpiry(c.passportExpiry || '');
    setNotes(c.notes || '');
    setOpeningDue(c.openingDue || 0);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      alert('Name and Mobile number are required.');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        nid: nid.trim(),
        passportNumber: passportNumber.trim().toUpperCase(),
        passportExpiry: passportExpiry,
        notes: notes.trim(),
        openingDue: Number(openingDue) || 0,
      });
    } else {
      addCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        nid: nid.trim(),
        passportNumber: passportNumber.trim().toUpperCase(),
        passportExpiry: passportExpiry,
        notes: notes.trim(),
        openingDue: Number(openingDue) || 0,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Customers & Accounts Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Passenger directory, passport registry, and individual balance ledgers
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, mobile, passport number, NID, city... (autocomplete live)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Customer Name & Contact</th>
                <th className="py-3 px-4">Passport & NID</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Opening Due</th>
                <th className="py-3 px-4 text-right">Current Due</th>
                <th className="py-3 px-4 text-right">Ledger Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const ledger = getCustomerLedger(cust.id);
                  const hasDue = ledger.currentDue > 0;

                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{cust.mobile}</div>
                        {cust.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {cust.passportNumber || <span className="text-slate-400 font-normal">No Passport</span>}
                        </div>
                        {cust.passportExpiry && (
                          <div className="text-[11px] text-slate-500">Exp: {cust.passportExpiry}</div>
                        )}
                        {cust.nid && (
                          <div className="text-[10px] text-slate-400 font-mono">NID: {cust.nid}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(ledger.totalSales)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(ledger.totalPaid)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums text-xs">
                        {cust.openingDue > 0 ? (
                          <span className="text-amber-700">{formatCurrency(cust.openingDue)}</span>
                        ) : (
                          <span className="text-slate-400">৳0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                        {hasDue ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatCurrency(ledger.currentDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">PAID (৳0)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Statement</span>
                          </button>

                          {hasDue && ledger.transactions.find(tx => tx.customerDue > 0) && onOpenPayment && (
                            <button
                              onClick={() => {
                                const tx = ledger.transactions.find(item => item.customerDue > 0);
                                if (tx) onOpenPayment(tx, 'customer');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>PAY</span>
                            </button>
                          )}

                          {cust.mobile && (
                            <a
                              href={`tel:${cust.mobile}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                              title="Call Customer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Edit Customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete customer ${cust.name}? This is an admin-only action and requires security OTP.`)) return;
                                try { await api.deleteCustomer(cust.id); window.location.reload(); }
                                catch (error) { alert(error instanceof Error ? error.message : 'Customer could not be deleted.'); }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Delete Customer (Admin + OTP)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Modal */}
      {selectedCustomerId && (
        <CustomerLedgerModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onSelectTransaction={onSelectTransaction}
          onOpenPayment={(tx) => onOpenPayment?.(tx, 'customer')}
        />
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    placeholder="e.g. Rahim Uddin"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    placeholder="01812-345678"
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={passportNumber}
                    placeholder="e.g. A03891244"
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Passport Expiry Date
                  </label>
                  <input
                    type="date"
                    value={passportExpiry}
                    onChange={(e) => setPassportExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    National ID (NID)
                  </label>
                  <input
                    type="text"
                    value={nid}
                    placeholder="NID Number"
                    onChange={(e) => setNid(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Opening Balance Due (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={openingDue}
                    placeholder="0"
                    onChange={(e) => setOpeningDue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-rose-600 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  placeholder="Street, City, Postal Code"
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  placeholder="Special instructions, visa details..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-between items-center gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setMobile('');
                    setWhatsapp('');
                    setEmail('');
                    setAddress('');
                    setNid('');
                    setPassportNumber('');
                    setPassportExpiry('');
                    setNotes('');
                    setOpeningDue(0);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                >
                  Clear Fields
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Customer Profile
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
