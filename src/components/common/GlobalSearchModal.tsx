import React, { useState, useEffect } from 'react';
import { Search, X, User, Briefcase, FileText, Plane, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Transaction, Vendor } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onSelectCustomer: (cust: Customer) => void;
  onSelectVendor: (vend: Vendor) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTransaction,
  onSelectCustomer,
  onSelectVendor,
}) => {
  const { transactions, customers, vendors } = useApp();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle search
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search Results
  const matchedCustomers = trimmed
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          c.mobile.includes(trimmed) ||
          (c.passportNumber && c.passportNumber.toLowerCase().includes(trimmed)) ||
          (c.nid && c.nid.includes(trimmed))
      ).slice(0, 4)
    : [];

  const matchedVendors = trimmed
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(trimmed) ||
          (v.company && v.company.toLowerCase().includes(trimmed)) ||
          v.mobile.includes(trimmed)
      ).slice(0, 4)
    : [];

  const matchedTransactions = trimmed
    ? transactions.filter((t) => {
        const inCustomer = t.customerName.toLowerCase().includes(trimmed) || t.customerMobile.includes(trimmed);
        const inInvoice = t.invoiceNumber.toLowerCase().includes(trimmed);
        const inService = t.serviceName.toLowerCase().includes(trimmed);
        const inFlight =
          t.flightDetails &&
          (t.flightDetails.pnr.toLowerCase().includes(trimmed) ||
            t.flightDetails.ticketNumber.toLowerCase().includes(trimmed) ||
            t.flightDetails.route.toLowerCase().includes(trimmed) ||
            t.flightDetails.flightNumber.toLowerCase().includes(trimmed));
        return inCustomer || inInvoice || inService || inFlight;
      }).slice(0, 6)
    : [];

  const totalResults = matchedCustomers.length + matchedVendors.length + matchedTransactions.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-20">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search customers, vendors, invoices, PNR, flight route, passport, mobile..."
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!trimmed && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Type at least 1 or 2 characters to search across all records instantly.
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No results found for "<span className="text-slate-700 font-semibold">{query}</span>"
            </div>
          )}

          {/* Transactions / Invoices Matches */}
          {matchedTransactions.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 mb-1">
                Invoices & Flight Tickets ({matchedTransactions.length})
              </div>
              <div className="divide-y divide-slate-100">
                {matchedTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      onClose();
                      onSelectTransaction(tx);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{tx.invoiceNumber}</span>
                          <span className="text-slate-600 font-normal">· {tx.customerName}</span>
                          {tx.flightDetails && (
                            <span className="text-blue-600 font-mono text-[11px]">
                              ({tx.flightDetails.route} · PNR: {tx.flightDetails.pnr})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatDate(tx.date)} · Service: {tx.serviceName} · Amount: {formatCurrency(tx.sellingPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        tx.customerDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {tx.customerDue > 0 ? `Due: ${formatCurrency(tx.customerDue)}` : 'PAID'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers Matches */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 mb-1">
                Customers ({matchedCustomers.length})
              </div>
              <div className="divide-y divide-slate-100">
                {matchedCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onClose();
                      onSelectCustomer(c);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                        <User className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Mobile: {c.mobile} {c.passportNumber ? `· Passport: ${c.passportNumber}` : ''}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vendors Matches */}
          {matchedVendors.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 mb-1">
                Vendors & Consolidators ({matchedVendors.length})
              </div>
              <div className="divide-y divide-slate-100">
                {matchedVendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onClose();
                      onSelectVendor(v);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                        <Briefcase className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{v.name}</div>
                        <div className="text-[11px] text-slate-500">{v.company} · {v.mobile}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
