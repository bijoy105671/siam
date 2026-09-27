import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plane, Printer, Plus, Trash2, Ticket, Upload } from 'lucide-react';

interface PnrCreationProps { onClose: () => void; }

type Sector = {
  airline: string; flightNo: string; from: string; to: string;
  departureDate: string; departureTime: string; arrivalDate: string; arrivalTime: string;
  bookingClass: string; seat: string; baggage: string;
};

const blankSector = (): Sector => ({
  airline: '', flightNo: '', from: '', to: '', departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '', bookingClass: '', seat: '', baggage: ''
});

export const PnrCreation: React.FC<PnrCreationProps> = ({ onClose }) => {
  const [airlinePnr, setAirlinePnr] = useState('');
  const [gdsPnr, setGdsPnr] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [passenger, setPassenger] = useState('');
  const [passport, setPassport] = useState('');
  const [frequentFlyer, setFrequentFlyer] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [logo, setLogo] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([blankSector()]);

  const updateSector = (index: number, key: keyof Sector, value: string) =>
    setSectors(prev => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));

  const printable = useMemo(() => ({
    airlinePnr, gdsPnr, ticketNumber, issueDate, passenger, passport, frequentFlyer, status, logo, sectors
  }), [airlinePnr,gdsPnr,ticketNumber,issueDate,passenger,passport,frequentFlyer,status,logo,sectors]);

  const printTicket = () => {
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    const rows = printable.sectors.map(s => `<tr><td>${s.airline||'-'}</td><td>${s.flightNo||'-'}</td><td><b>${s.from||'-'}</b> → <b>${s.to||'-'}</b></td><td>${s.departureDate||'-'} ${s.departureTime||''}</td><td>${s.arrivalDate||'-'} ${s.arrivalTime||''}</td><td>${s.bookingClass||'-'}</td><td>${s.seat||'-'}</td><td>${s.baggage||'-'}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><title>SIAM AIR E-Ticket</title><style>
      body{font-family:Arial,sans-serif;margin:30px;color:#172033} .ticket{max-width:820px;margin:auto;border:1px solid #d7deea;border-radius:16px;overflow:hidden}
      .head{padding:22px;background:#0b5cab;color:#fff;display:flex;justify-content:space-between}.title{font-size:22px;font-weight:800}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:20px;border-bottom:1px solid #e5eaf1}.label{font-size:10px;color:#718096;text-transform:uppercase}.value{font-weight:700;margin-top:3px}
      table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:10px;border-bottom:1px solid #edf1f5;text-align:left}th{background:#f7f9fc;color:#667085}
      .note{padding:16px;font-size:10px;color:#667085}@media print{body{margin:0}.ticket{border:0}}
    </style></head><body><div class="ticket"><div class="head"><div><div class="title">SIAM AIR AND DIGITAL SERVICE</div><div>E-TICKET / ITINERARY</div></div><div><b>${printable.status}</b><br>PNR: ${printable.airlinePnr||'-'}</div></div>
      <div class="grid"><div><div class="label">Passenger Name</div><div class="value">${printable.passenger||'-'}</div></div><div><div class="label">Ticket Number</div><div class="value">${printable.ticketNumber||'-'}</div></div><div><div class="label">GDS PNR</div><div class="value">${printable.gdsPnr||'-'}</div></div><div><div class="label">Passport</div><div class="value">${printable.passport||'-'}</div></div><div><div class="label">Frequent Flyer</div><div class="value">${printable.frequentFlyer||'-'}</div></div><div><div class="label">Date of Issue</div><div class="value">${printable.issueDate||'-'}</div></div></div>
      <table><thead><tr><th>Airline</th><th>Flight</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Class</th><th>Seat</th><th>Baggage</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="note">This is an itinerary / e-ticket presentation prepared by SIAM AIR AND DIGITAL SERVICE. It is not an accounting transaction and does not create customer, vendor, due, payment, profit or account-balance entries.</div>
    </div><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const field = (label: string, value: string, setValue: (v: string) => void, type = 'text') => (
    <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={e=>setValue(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );

  return <div className="space-y-3">
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300"><Ticket className="w-4 h-4"/> Ticket Preparation</div>
          <h1 className="text-base sm:text-lg font-extrabold mt-0.5">PNR CREATION & E-TICKET</h1>
          <p className="text-[11px] text-slate-300 mt-0.5">Ticket information only — no accounting connection.</p></div>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold"><ArrowLeft className="w-4 h-4"/> Back</button>
      </div>
      <div className="p-4 sm:p-5 space-y-5">
        <section><div className="text-xs font-extrabold text-slate-900 mb-3">E-TICKET INFORMATION</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field('Airline PNR',airlinePnr,setAirlinePnr)}{field('Galileo / GDS PNR',gdsPnr,setGdsPnr)}
            {field('Ticket Number',ticketNumber,setTicketNumber)}{field('Date of Issue',issueDate,setIssueDate,'date')}
            {field('Passenger Name',passenger,setPassenger)}{field('Passport Number',passport,setPassport)}
            {field('Frequent Flyer Number',frequentFlyer,setFrequentFlyer)}
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Ticket Status</span><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>CONFIRMED</option><option>REISSUED</option><option>CANCELLED</option><option>REFUNDED</option><option>VOID</option></select></label>
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Airline Logo</span><span className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500"><Upload className="w-4 h-4"/><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(f){const rd=new FileReader(); rd.onload=()=>setLogo(String(rd.result||'')); rd.readAsDataURL(f);}}}/></span></label>
          </div>
        </section>

        <section><div className="flex items-center justify-between mb-3"><div className="text-xs font-extrabold text-slate-900">ITINERARY / FLIGHT SECTORS</div><button onClick={()=>setSectors(p=>[...p,blankSector()])} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-2.5 py-1.5 text-[11px] font-bold"><Plus className="w-3.5 h-3.5"/> Add Sector</button></div>
          <div className="space-y-3">{sectors.map((s,i)=><div key={i} className="rounded-2xl border border-slate-200 p-3 bg-slate-50/60">
            <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold text-slate-600">SECTOR {i+1}</span>{sectors.length>1&&<button onClick={()=>setSectors(p=>p.filter((_,x)=>x!==i))} className="text-rose-500"><Trash2 className="w-4 h-4"/></button>}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {field('Airline',s.airline,v=>updateSector(i,'airline',v))}{field('Flight Number',s.flightNo,v=>updateSector(i,'flightNo',v))}
              {field('From',s.from,v=>updateSector(i,'from',v))}{field('To',s.to,v=>updateSector(i,'to',v))}
              {field('Departure Date',s.departureDate,v=>updateSector(i,'departureDate',v),'date')}{field('Departure Time',s.departureTime,v=>updateSector(i,'departureTime',v),'time')}
              {field('Arrival Date',s.arrivalDate,v=>updateSector(i,'arrivalDate',v),'date')}{field('Arrival Time',s.arrivalTime,v=>updateSector(i,'arrivalTime',v),'time')}
              {field('Booking Class',s.bookingClass,v=>updateSector(i,'bookingClass',v))}{field('Seat',s.seat,v=>updateSector(i,'seat',v))}{field('Baggage',s.baggage,v=>updateSector(i,'baggage',v))}
            </div>
          </div>)}</div>
        </section>

        <div className="flex flex-col sm:flex-row gap-2 justify-end border-t pt-4">
          <button onClick={()=>{setAirlinePnr('');setGdsPnr('');setTicketNumber('');setIssueDate('');setPassenger('');setPassport('');setFrequentFlyer('');setStatus('CONFIRMED');setSectors([blankSector()]);}} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700">Clear</button>
          <button onClick={printTicket} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-2.5 text-xs font-bold"><Printer className="w-4 h-4"/> Print / Save E-Ticket</button>
        </div>
      </div>
    </div>
  </div>;
};
