import React from 'react';
import { FileText } from 'lucide-react';

export const InvoiceCenter: React.FC = () => (
  <div className="p-4 bg-white rounded-xl border border-slate-200">
    <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Invoice Center</h1>
    <p className="text-xs text-slate-500 mt-2">Invoice management workspace.</p>
  </div>
);
