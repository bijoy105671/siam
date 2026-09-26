import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  FileText,
  PhoneCall,
  Edit,
  DollarSign,
  Building,
  X,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction, Vendor } from '../../types';
import { formatCurrency, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { VendorLedgerModal } from './VendorLedgerModal';
import { api } from '../../services/apiClient';

interface VendorListProps {
  onSelectTransaction: (tx: Transaction) => void;
}

export const VendorList: React.FC<VendorListProps> = ({ onSelectTransaction }) => {
  const { vendors, addVendor, updateVendor, getVendorLedger, settings, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [openingPayable, setOpeningPayable] = useState<number | ''>(0);

  const filteredVendors = vendors.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.company && v.company.toLowerCase().includes(q)) ||
      v.mobile.includes(q) ||
      (v.address && v.address.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setName('');
    setCompany('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setAccountInfo('');
    setOpeningPayable(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setName(v.name);
    setCompany(v.company || '');
    setMobile(v.mobile);
    setWhatsapp(v.whatsapp || '');
    setEmail(v.email || '');
    setAddress(v.address || '');
    setAccountInfo(v.accountInfo || '');
    setOpeningPayable(v.openingPayable || 0);
    setIsModalOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vendor Name is required.');
      return;
    }

    if (editingVendor) {
      updateVendor(editingVendor.id, {
        name: name.trim(),
        company: company.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        accountInfo: accountInfo.trim(),
        openingPayable: Number(openingPayable) || 0,
      });
    } else {
      addVendor({
        name: name.trim(),
        company: company.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        accountInfo: accountInfo.trim(),
        openingPayable: Number(openingPayable) || 0,
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
            <Briefcase className="w-6 h-6 text-amber-600" />
            <span>Vendors & Consolidators Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Airlines, GSA suppliers, visa processors, and payable settlements
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by vendor name, company, mobile, bank info... (autocomplete live)"
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

      {/* Vendors Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Vendor & Company</th>
                <th className="py-3 px-4">Account / Bank Details</th>
                <th className="py-3 px-4 text-right">Total Purchases / Cost</th>
                <th className="py-3 px-4 text-right">Total Disbursed</th>
                <th className="py-3 px-4 text-right">Opening Payable</th>
                <th className="py-3 px-4 text-right">Current Payable</th>
                <th className="py-3 px-4 text-right">Ledger Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No vendors found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vend) => {
                  const ledger = getVendorLedger(vend.id);
                  const hasDue = ledger.currentPayable > 0;

                  return (
                    <tr
                      key={vend.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDue ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900 text-sm">{vend.name}</div>
                        <div className="text-xs text-slate-600 font-medium">{vend.company}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{vend.mobile}</div>
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="text-slate-800 text-xs font-mono">
                          {vend.accountInfo || <span className="text-slate-400">Cash / Desk Settlement</span>}
                        </div>
                        {vend.address && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{vend.address}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(ledger.totalCost)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-blue-600 tabular-nums">
                        {formatCurrency(ledger.totalPaid)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums text-xs">
                        {vend.openingPayable > 0 ? (
                          <span className="text-amber-800">{formatCurrency(vend.openingPayable)}</span>
                        ) : (
                          <span className="text-slate-400">৳0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                        {hasDue ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatCurrency(ledger.currentPayable)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">৳0 (Cleared)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedVendorId(vend.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Statement</span>
                          </button>

                          {vend.mobile && (
                            <a
                              href={`tel:${vend.mobile}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                              title="Call Vendor"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEdit(vend)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Edit Vendor"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

      {/* Vendor Ledger Modal */}
      {selectedVendorId && (
        <VendorLedgerModal
          vendorId={selectedVendorId}
          onClose={() => setSelectedVendorId(null)}
          onSelectTransaction={onSelectTransaction}
        />
      )}

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingVendor ? 'Edit Vendor Profile' : 'Add New Vendor Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vendor / Agency Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    placeholder="e.g. Dynamic Travels Ltd"
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company / Brand Name
                  </label>
                  <input
                    type="text"
                    value={company}
                    placeholder="e.g. Dynamic Aviation & GSA"
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile / Phone Number
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    placeholder="01711-223344"
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Opening Payable Due (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={openingPayable}
                    placeholder="0"
                    onChange={(e) => setOpeningPayable(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-amber-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bank Account & Payment Routing Info
                </label>
                <input
                  type="text"
                  value={accountInfo}
                  placeholder="e.g. Islami Bank A/C: 205012345678, Branch: Motijheel"
                  onChange={(e) => setAccountInfo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  value={address}
                  placeholder="e.g. Kakrail VIP Road, Dhaka"
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-between items-center gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setCompany('');
                    setMobile('');
                    setWhatsapp('');
                    setEmail('');
                    setAddress('');
                    setAccountInfo('');
                    setOpeningPayable(0);
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
                    Save Vendor Profile
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
