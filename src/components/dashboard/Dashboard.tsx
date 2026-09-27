import React, { useState } from 'react';
import { Calculator, Plane, Ticket, X, RotateCcw, ArrowRight } from 'lucide-react';
import { Dashboard as ExistingDashboard } from './DashboardLegacy';

type Props = React.ComponentProps<typeof ExistingDashboard>;

type CalcMode = 'net' | 'reissue' | 'refund';

const num = (v: string) => Number.parseFloat(v) || 0;
const money = (v: number) => `৳ ${v.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const Dashboard: React.FC<Props> = (props) => {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [mode, setMode] = useState<CalcMode>('net');
  const [values, setValues] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setValues((p) => ({ ...p, [key]: value }));
  const v = (key: string) => values[key] || '';
  const clear = () => setValues({});

  let result = 0;
  let resultLabel = 'NET FARE';
  if (mode === 'net') {
    const gross = num(v('gross')); const base = num(v('base'));
    result = gross - base * 0.07 + gross * 0.003;
  } else if (mode === 'reissue') {
    const inside = (num(v('newBase')) - num(v('oldBase'))) + (num(v('newTax')) - num(v('oldTax'))) + num(v('penalty'));
    result = inside + inside * 0.003; resultLabel = 'REISSUE CHARGE';
  } else {
    const net = num(v('net')); const penalty = num(v('refundPenalty')); const other = num(v('otherTax'));
    result = net - penalty - other - net * 0.003; resultLabel = 'FULL REFUND';
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button type="button" onClick={props.onOpenNewEntry} className="group text-left rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer">
          <div className="flex items-start justify-between gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center"><Plane className="w-6 h-6" /></span>
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-5 text-lg sm:text-xl font-bold">PNR CREATION &amp; E-TICKET</div>
          <div className="mt-1 text-sm text-blue-100">Create booking/service entry, passenger details, PNR and invoice/e-ticket from One Entry.</div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold"><Ticket className="w-4 h-4" /> OPEN PNR CREATION</div>
        </button>

        <button type="button" onClick={() => setCalculatorOpen(true)} className="group text-left rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer">
          <div className="flex items-start justify-between gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center"><Calculator className="w-6 h-6" /></span>
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-5 text-lg sm:text-xl font-bold">FARE CALCULATOR</div>
          <div className="mt-1 text-sm text-emerald-100">Net Fare, Reissue and Refund calculations in a compact mobile-friendly calculator.</div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold"><Calculator className="w-4 h-4" /> OPEN CALCULATOR</div>
        </button>
      </div>

      {calculatorOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b bg-white/95 backdrop-blur">
              <div><div className="text-lg font-bold text-slate-900">SIAM AIR Fare Calculator</div><div className="text-xs text-slate-500">Net Fare · Reissue · Refund</div></div>
              <button type="button" onClick={() => setCalculatorOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 mb-5">
                {([['net','NET FARE'],['reissue','REISSUE'],['refund','REFUND']] as const).map(([key,label]) => (
                  <button type="button" key={key} onClick={() => { setMode(key); clear(); }} className={`rounded-xl px-2 py-3 text-xs sm:text-sm font-bold cursor-pointer ${mode === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>{label}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mode === 'net' && <><Field label="Gross Fare" value={v('gross')} onChange={(x) => set('gross', x)} /><Field label="Base Fare" value={v('base')} onChange={(x) => set('base', x)} /></>}
                {mode === 'reissue' && <><Field label="Old Base Fare" value={v('oldBase')} onChange={(x) => set('oldBase', x)} /><Field label="Old Tax" value={v('oldTax')} onChange={(x) => set('oldTax', x)} /><Field label="New Base Fare" value={v('newBase')} onChange={(x) => set('newBase', x)} /><Field label="New Tax" value={v('newTax')} onChange={(x) => set('newTax', x)} /><Field label="Penalty / Change Charge" value={v('penalty')} onChange={(x) => set('penalty', x)} /></>}
                {mode === 'refund' && <><Field label="Net Fare" value={v('net')} onChange={(x) => set('net', x)} /><Field label="Penalty" value={v('refundPenalty')} onChange={(x) => set('refundPenalty', x)} /><Field label="Other Non-refundable Tax" value={v('otherTax')} onChange={(x) => set('otherTax', x)} /></>}
              </div>

              <div className="mt-5 rounded-2xl bg-slate-950 text-white p-5">
                <div className="text-xs text-slate-400">{resultLabel}</div>
                <div className="text-3xl sm:text-4xl font-extrabold mt-1 tabular-nums">{money(result)}</div>
                <div className="text-xs text-slate-400 mt-2">Result updates automatically as you enter values.</div>
              </div>
              <button type="button" onClick={clear} className="mt-4 w-full rounded-2xl py-3 bg-slate-100 text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" /> CLEAR</button>
            </div>
          </div>
        </div>
      )}

      <ExistingDashboard {...props} />
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span><input inputMode="decimal" type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></label>
);
