import React, { useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { ArrowLeft, Palette, Plane, Printer, Plus, RotateCcw, Save, Ticket, Trash2, Upload } from 'lucide-react';

interface PnrCreationProps { onClose: () => void; }

type Sector = {
  airline: string; flightNo: string; from: string; to: string;
  departureDate: string; departureTime: string; arrivalDate: string; arrivalTime: string;
  bookingClass: string; seat: string; baggage: string;
};

type Template = {
  id: string; name: string; accent: string; header: string; radius: string;
  compact: boolean; showPassport: boolean; showFrequentFlyer: boolean;
};

const TEMPLATES: Template[] = [
  { id: 'gds', name: 'GDS Classic (Amadeus / Travelport style)', accent: '#0b5cab', header: '#0f172a', radius: '12px', compact: true, showPassport: true, showFrequentFlyer: true },
  { id: 'sabre', name: 'GDS Redline (Sabre-inspired)', accent: '#b91c1c', header: '#111827', radius: '10px', compact: true, showPassport: true, showFrequentFlyer: true },
  { id: 'siam', name: 'SIAM AIR Professional', accent: '#15803d', header: '#0f766e', radius: '18px', compact: false, showPassport: true, showFrequentFlyer: true },
  { id: 'modern', name: 'Modern E-Ticket', accent: '#0369a1', header: '#075985', radius: '22px', compact: false, showPassport: false, showFrequentFlyer: true },
  { id: 'custom', name: 'My Custom Template', accent: '#7c3aed', header: '#312e81', radius: '18px', compact: false, showPassport: true, showFrequentFlyer: true }
];

const blankSector = (): Sector => ({
  airline: '', flightNo: '', from: '', to: '', departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '', bookingClass: '', seat: '', baggage: ''
});

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c));

const detectValue = (text: string, patterns: RegExp[]) => {
  for (const p of patterns) { const m = text.match(p); if (m?.[1]) return m[1].trim(); }
  return '';
};

const parseImportedText = (raw: string) => {
  const text = raw
    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\\s+/g, ' ')
    .trim();
  const airlinePnr = detectValue(text, [
    /(?:AIRLINE\\s*)?PNR\\s*[:#-]?\\s*([A-Z0-9]{5,8})/i,
    /BOOKING\\s*(?:REFERENCE|REF)\\s*[:#-]?\\s*([A-Z0-9]{5,8})/i,
    /RECORD\\s*LOCATOR\\s*[:#-]?\\s*([A-Z0-9]{5,8})/i
  ]);
  const ticketNumber = detectValue(text, [
    /TICKET(?:\\s*(?:NUMBER|NO|NUM))?\\s*[:#-]?\\s*([0-9]{10,14})/i,
    /\\b(\\d{3}-?\\d{10})\\b/
  ]);
  const passport = detectValue(text, [/PASSPORT(?:\\s*(?:NUMBER|NO))?\\s*[:#-]?\\s*([A-Z0-9]{6,12})/i]);
  const passenger = detectValue(text, [
    /(?:PASSENGER|PAX)(?:\\s*(?:NAME|NAME/S))?\\s*[:#-]?\\s*([A-Z][A-Z .,'/-]{3,})/i,
    /(?:TRAVELER|TRAVELLER)\\s*(?:NAME)?\\s*[:#-]?\\s*([A-Z][A-Z .,'/-]{3,})/i
  ]);
  const gdsPnr = detectValue(text, [
    /(?:GDS|GALILEO|AMADEUS|SABRE|TRAVELPORT)(?:\\s*)PNR\\s*[:#-]?\\s*([A-Z0-9]{5,8})/i
  ]);
  const airline = detectValue(text, [/(?:AIRLINE|CARRIER)\\s*[:#-]?\\s*([A-Z][A-Z &.-]{2,})/i]);
  const flightNo = detectValue(text, [
    /FLIGHT(?:\\s*(?:NUMBER|NO))?\\s*[:#-]?\\s*([A-Z0-9]{2,8})/i,
    /\\b([A-Z]{2}\\s*\\d{2,4})\\b/
  ]);
  const date = detectValue(text, [
    /(?:DEPARTURE|DEPART|TRAVEL|FLIGHT)\\s*(?:DATE)?\\s*[:#-]?\\s*(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})/i
  ]);
  const time = detectValue(text, [/(?:DEPARTURE|DEPART)\\s*TIME\\s*[:#-]?\\s*(\\d{1,2}:\\d{2})/i]);
  const route = text.match(/\\b([A-Z]{3})\\s*(?:-|→|TO)\\s*([A-Z]{3})\\b/i);
  const sector: Sector = {
    ...blankSector(),
    airline,
    flightNo,
    from: route?.[1]?.toUpperCase() || '',
    to: route?.[2]?.toUpperCase() || '',
    departureDate: date,
    departureTime: time
  };
  return { airlinePnr, gdsPnr, ticketNumber, passenger, passport, sectors: [sector], rawText: text.slice(0, 20000) };
};

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
  const [templateId, setTemplateId] = useState('siam');
  const [accent, setAccent] = useState('#15803d');
  const [header, setHeader] = useState('#0f766e');
  const [radius, setRadius] = useState('18px');
  const [showPassport, setShowPassport] = useState(true);
  const [showFrequentFlyer, setShowFrequentFlyer] = useState(true);
  const [showBaggage, setShowBaggage] = useState(true);
  const [showTicketNumber, setShowTicketNumber] = useState(true);
  const [showGdsPnr, setShowGdsPnr] = useState(true);
  const [customTitle, setCustomTitle] = useState('SIAM AIR AND DIGITAL SERVICE');
  const [customFooter, setCustomFooter] = useState('Ticket information only — no accounting connection.');
  const [importStatus, setImportStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[2];
    setTemplateId(id); setAccent(t.accent); setHeader(t.header); setRadius(t.radius);
    setShowPassport(t.showPassport); setShowFrequentFlyer(t.showFrequentFlyer);
  };

  const updateSector = (index: number, key: keyof Sector, value: string) =>
    setSectors(prev => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));

  const clearAll = () => {
    setAirlinePnr(''); setGdsPnr(''); setTicketNumber(''); setIssueDate(''); setPassenger('');
    setPassport(''); setFrequentFlyer(''); setStatus('CONFIRMED'); setLogo(''); setSectors([blankSector()]);
    setImportStatus('');
  };

  const importFile = async (file: File) => {
    setImportStatus('Reading ticket file…');
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setImportStatus('Extracting text from PDF…');
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
        }
        const dataBase64 = btoa(binary);
        const response = await fetch('/api/ticket-import/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ dataBase64, filename: file.name })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'PDF extraction failed');
        const parsed = parseImportedText(String(result.text || ''));
        if (parsed.airlinePnr) setAirlinePnr(parsed.airlinePnr);
        if (parsed.gdsPnr) setGdsPnr(parsed.gdsPnr);
        if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
        if (parsed.passenger) setPassenger(parsed.passenger);
        if (parsed.passport) setPassport(parsed.passport);
        if (parsed.sectors[0]) setSectors(parsed.sectors);
        setImportStatus('PDF data extracted successfully. Please review all fields before generating the e-ticket.');
        return;
      }
      if (file.type.startsWith('image/')) {
        setImportStatus('Reading ticket image with OCR…');
        const worker = await createWorker('eng');
        try {
          const { data } = await worker.recognize(file);
          const parsed = parseImportedText(String(data.text || ''));
          if (parsed.airlinePnr) setAirlinePnr(parsed.airlinePnr);
          if (parsed.gdsPnr) setGdsPnr(parsed.gdsPnr);
          if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
          if (parsed.passenger) setPassenger(parsed.passenger);
          if (parsed.passport) setPassport(parsed.passport);
          if (parsed.sectors[0]) setSectors(parsed.sectors);
          if (!String(data.text || '').trim()) throw new Error('No readable text was found in the image.');
          setImportStatus('JPG/PNG/GIF ticket read successfully with OCR. Please review the detected fields before generating.');
        } finally {
          await worker.terminate();
        }
        return;
      }
      const raw = await file.text();
      const parsed = parseImportedText(raw);
      if (parsed.airlinePnr) setAirlinePnr(parsed.airlinePnr);
      if (parsed.gdsPnr) setGdsPnr(parsed.gdsPnr);
      if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
      if (parsed.passenger) setPassenger(parsed.passenger);
      if (parsed.passport) setPassport(parsed.passport);
      if (parsed.sectors[0]) setSectors(parsed.sectors);
      setImportStatus('Ticket data detected. Please review before generating.');
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Could not read this ticket automatically. Please enter the information manually.');
    }
  };

  const importLink = async () => {
    const url = window.prompt('Paste ticket / booking URL');
    if (!url) return;
    setImportStatus('Trying to read link…');
    try {
      const response = await fetch(url);
      const raw = await response.text();
      const parsed = parseImportedText(raw);
      if (parsed.airlinePnr) setAirlinePnr(parsed.airlinePnr);
      if (parsed.gdsPnr) setGdsPnr(parsed.gdsPnr);
      if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
      if (parsed.passenger) setPassenger(parsed.passenger);
      if (parsed.passport) setPassport(parsed.passport);
      if (parsed.sectors[0]) setSectors(parsed.sectors);
      setImportStatus('Link data detected. Please review all fields before generating.');
    } catch {
      setImportStatus('This link does not allow browser access (CORS/login protection). Download the ticket and use Upload instead.');
    }
  };

  const saveCustomTemplate = () => {
    localStorage.setItem('siam_ticket_custom_template', JSON.stringify({ accent, header, radius, showPassport, showFrequentFlyer, showBaggage, showTicketNumber, showGdsPnr, customTitle, customFooter }));
    setTemplateId('custom');
    setImportStatus('Custom ticket template saved on this device.');
  };

  const loadCustomTemplate = () => {
    try {
      const x = JSON.parse(localStorage.getItem('siam_ticket_custom_template') || '{}');
      if (x.accent) setAccent(x.accent); if (x.header) setHeader(x.header); if (x.radius) setRadius(x.radius);
      if (typeof x.showPassport === 'boolean') setShowPassport(x.showPassport);
      if (typeof x.showFrequentFlyer === 'boolean') setShowFrequentFlyer(x.showFrequentFlyer);
      if (typeof x.showBaggage === 'boolean') setShowBaggage(x.showBaggage);
      if (typeof x.showTicketNumber === 'boolean') setShowTicketNumber(x.showTicketNumber);
      if (typeof x.showGdsPnr === 'boolean') setShowGdsPnr(x.showGdsPnr);
      if (x.customTitle) setCustomTitle(x.customTitle); if (x.customFooter) setCustomFooter(x.customFooter);
      setTemplateId('custom'); setImportStatus('Saved custom template loaded.');
    } catch { setImportStatus('No saved custom template found on this device.'); }
  };

  const printable = useMemo(() => ({ airlinePnr, gdsPnr, ticketNumber, issueDate, passenger, passport, frequentFlyer, status, logo, sectors }), [airlinePnr,gdsPnr,ticketNumber,issueDate,passenger,passport,frequentFlyer,status,logo,sectors]);

  const printTicket = () => {
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    const logoHtml = printable.logo ? '<img src="' + printable.logo + '" style="height:42px;max-width:150px;object-fit:contain;background:#fff;border-radius:8px;padding:3px" />' : '';
    const rows = printable.sectors.map(s => '<tr><td>' + escapeHtml(s.airline || '-') + '</td><td><b>' + escapeHtml(s.flightNo || '-') + '</b></td><td><b>' + escapeHtml(s.from || '-') + ' → ' + escapeHtml(s.to || '-') + '</b></td><td>' + escapeHtml(s.departureDate || '-') + ' ' + escapeHtml(s.departureTime || '') + '</td><td>' + escapeHtml(s.arrivalDate || '-') + ' ' + escapeHtml(s.arrivalTime || '') + '</td><td>' + escapeHtml(s.bookingClass || '-') + '</td><td>' + escapeHtml(s.seat || '-') + '</td>' + (showBaggage ? '<td>' + escapeHtml(s.baggage || '-') + '</td>' : '') + '</tr>').join('');
    const passengerCells = '<div><div class="label">Passenger Name</div><div class="value">' + escapeHtml(printable.passenger || '-') + '</div></div>' +
      (showTicketNumber ? '<div><div class="label">Ticket Number</div><div class="value">' + escapeHtml(printable.ticketNumber || '-') + '</div></div>' : '') +
      (showGdsPnr ? '<div><div class="label">GDS PNR</div><div class="value">' + escapeHtml(printable.gdsPnr || '-') + '</div></div>' : '') +
      (showPassport ? '<div><div class="label">Passport</div><div class="value">' + escapeHtml(printable.passport || '-') + '</div></div>' : '') +
      (showFrequentFlyer ? '<div><div class="label">Frequent Flyer</div><div class="value">' + escapeHtml(printable.frequentFlyer || '-') + '</div></div>' : '') +
      '<div><div class="label">Date of Issue</div><div class="value">' + escapeHtml(printable.issueDate || '-') + '</div></div>';
    w.document.write('<!doctype html><html><head><title>SIAM AIR E-Ticket</title><style>' +
      'body{font-family:Arial,sans-serif;margin:30px;color:#172033;background:#f8fafc}.ticket{max-width:820px;margin:auto;border:1px solid #d7deea;border-radius:' + radius + ';overflow:hidden;background:#fff}' +
      '.head{padding:18px 22px;background:' + header + ';color:#fff;display:flex;justify-content:space-between;gap:20px;align-items:center}.title{font-size:20px;font-weight:800}.sub{font-size:11px;opacity:.85;margin-top:3px}.pnr{font-size:12px;text-align:right}' +
      '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:18px;border-bottom:1px solid #e5eaf1}.label{font-size:9px;color:#718096;text-transform:uppercase;letter-spacing:.05em}.value{font-weight:700;margin-top:3px;font-size:12px}' +
      'table{width:100%;border-collapse:collapse;font-size:' + (TEMPLATES.find(t=>t.id===templateId)?.compact ? '10px' : '11px') + '}th,td{padding:9px;border-bottom:1px solid #edf1f5;text-align:left}th{background:#f7f9fc;color:#667085;font-size:9px;text-transform:uppercase}' +
      '.note{padding:14px;font-size:9px;color:#667085}.logo{height:42px;max-width:150px;object-fit:contain;background:#fff;border-radius:8px;padding:3px}@media print{body{margin:0;background:#fff}.ticket{border:0;max-width:none}}' +
      '</style></head><body><div class="ticket"><div class="head"><div>' + logoHtml + '<div class="title">' + escapeHtml(customTitle) + '</div><div class="sub">PNR CREATION & E-TICKET</div></div><div class="pnr"><b>' + escapeHtml(printable.status) + '</b><br>PNR: ' + escapeHtml(printable.airlinePnr || '-') + '</div></div>' +
      '<div class="grid">' + passengerCells + '</div><table><thead><tr><th>Airline</th><th>Flight</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Class</th><th>Seat</th>' + (showBaggage ? '<th>Baggage</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table><div class="note">' + escapeHtml(customFooter) + '</div></div><script>window.onload=()=>window.print()</script></body></html>');
    w.document.close();
  };

  const field = (label: string, value: string, setValue: (v: string) => void, type = 'text') => (
    <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={e=>setValue(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
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
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div><div className="text-xs font-extrabold text-slate-900">IMPORT / AUTO READ TICKET</div><div className="text-[11px] text-slate-500 mt-1">PDF, HTML/text and ticket links can be scanned for common fields. Images are loaded for review; full OCR can be added when a server OCR/AI provider is configured.</div></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-bold"><Upload className="w-4 h-4"/> Upload PDF / JPG / PNG / GIF / HTML</button>
              <input ref={fileRef} type="file" hidden accept=".pdf,.html,.htm,.txt,image/jpeg,image/png,image/gif" onChange={e=>{const f=e.target.files?.[0]; if(f) void importFile(f); e.currentTarget.value='';}} />
              <button onClick={importLink} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">🔗 Import Link</button>
            </div>
          </div>
          {importStatus && <div className="mt-2 rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600 border border-blue-100">{importStatus}</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <div><div className="text-xs font-extrabold text-slate-900">TICKET TEMPLATE</div><div className="text-[11px] text-slate-500 mt-1">Choose a ready layout, then customize it for your own SIAM AIR ticket format.</div></div>
            <select value={templateId} onChange={e=>applyTemplate(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold min-w-[260px]">
              {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {TEMPLATES.map(t=><button key={t.id} onClick={()=>applyTemplate(t.id)} className={'text-left rounded-xl border p-3 ' + (templateId===t.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}>
              <div className="h-2 rounded-full mb-2" style={{background:t.accent}}/><div className="text-[11px] font-extrabold text-slate-800">{t.name}</div><div className="text-[10px] text-slate-500 mt-1">{t.compact ? 'Compact GDS-style' : 'Modern customer-facing'}</div>
            </button>)}
          </div>
        </section>

        <section><div className="text-xs font-extrabold text-slate-900 mb-3">E-TICKET INFORMATION</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field('Airline PNR',airlinePnr,setAirlinePnr)}{field('Galileo / GDS PNR',gdsPnr,setGdsPnr)}
            {field('Ticket Number',ticketNumber,setTicketNumber)}{field('Date of Issue',issueDate,setIssueDate,'date')}
            {field('Passenger Name',passenger,setPassenger)}{field('Passport Number',passport,setPassport)}
            {field('Frequent Flyer Number',frequentFlyer,setFrequentFlyer)}
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Ticket Status</span><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>CONFIRMED</option><option>REISSUED</option><option>CANCELLED</option><option>REFUNDED</option><option>VOID</option></select></label>
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Airline / Agent Logo</span><span className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500"><Upload className="w-4 h-4"/><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(f){const rd=new FileReader(); rd.onload=()=>setLogo(String(rd.result||'')); rd.readAsDataURL(f);}}}/></span></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3"><Palette className="w-4 h-4 text-emerald-600"/><div className="text-xs font-extrabold text-slate-900">CUSTOMIZE TEMPLATE</div></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-[10px] font-bold text-slate-500">Accent<input type="color" value={accent} onChange={e=>setAccent(e.target.value)} className="block mt-1 w-full h-9 rounded-lg"/></label>
            <label className="text-[10px] font-bold text-slate-500">Header<input type="color" value={header} onChange={e=>setHeader(e.target.value)} className="block mt-1 w-full h-9 rounded-lg"/></label>
            <label className="text-[10px] font-bold text-slate-500">Corner Radius<select value={radius} onChange={e=>setRadius(e.target.value)} className="block mt-1 w-full rounded-lg border px-2 py-2 text-xs"><option>0px</option><option>10px</option><option>18px</option><option>22px</option></select></label>
            <label className="text-[10px] font-bold text-slate-500">Title<input value={customTitle} onChange={e=>setCustomTitle(e.target.value)} className="block mt-1 w-full rounded-lg border px-2 py-2 text-xs"/></label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-[11px]">
            {([['Passport',showPassport,setShowPassport],['Frequent Flyer',showFrequentFlyer,setShowFrequentFlyer],['Baggage',showBaggage,setShowBaggage],['Ticket No.',showTicketNumber,setShowTicketNumber],['GDS PNR',showGdsPnr,setShowGdsPnr]] as [string,boolean,(v:boolean)=>void][]).map(([label,value,set])=><label key={label} className="flex items-center gap-2 rounded-xl bg-white border px-3 py-2"><input type="checkbox" checked={value} onChange={e=>set(e.target.checked)}/>{label}</label>)}
          </div>
          <textarea value={customFooter} onChange={e=>setCustomFooter(e.target.value)} rows={2} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" placeholder="Footer / notes"/>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={saveCustomTemplate} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-bold"><Save className="w-4 h-4"/> Save Custom Template</button>
            <button onClick={loadCustomTemplate} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold"><RotateCcw className="w-4 h-4"/> Load Saved</button>
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
          <button onClick={clearAll} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700">Clear</button>
          <button onClick={printTicket} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white" style={{background:accent}}><Printer className="w-4 h-4"/> Preview / Print / Save E-Ticket</button>
        </div>
      </div>
    </div>
  </div>;
};
