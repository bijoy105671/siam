import React from 'react';
import { ArrowLeft, Plane, Ticket } from 'lucide-react';
import { OneEntryForm } from './OneEntryForm';
import { Transaction } from '../../types';

interface PnrCreationProps {
  onClose: () => void;
  onViewInvoice: (tx: Transaction) => void;
}

export const PnrCreation: React.FC<PnrCreationProps> = ({ onClose, onViewInvoice }) => (
  <div className="space-y-3">
    <div className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-blue-700 to-sky-600 text-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-100">
            <Plane className="w-4 h-4" />
            PNR / E-TICKET MODULE
          </div>
          <h1 className="text-base sm:text-lg font-extrabold mt-0.5">PNR CREATION & E-TICKET</h1>
          <p className="text-[11px] text-blue-100 mt-0.5">Create the booking, connect customer + service + vendor, then print/view the ticket invoice.</p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
      <div className="px-4 py-2.5 bg-blue-50/70 border-t border-blue-100 flex items-center gap-2 text-[11px] text-blue-800">
        <Ticket className="w-4 h-4" />
        <span>PNR, ticket, passenger, route, customer payment and vendor cost stay connected to the same transaction record.</span>
      </div>
    </div>
    <OneEntryForm onClose={onClose} onViewInvoice={onViewInvoice} />
  </div>
);
