import React, { useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { ArrowLeft, Palette, Printer, Plus, RotateCcw, Save, Ticket, Trash2, Upload } from 'lucide-react';

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

const AIRLINE_CODES: Record<string, string> = {
  'AIR ARABIA':'G9','AIR ARABIA ABU DHABI':'3L','AIR ASTANA':'KC','AIR INDIA':'AI','AIR INDIA EXPRESS':'IX',
  'BANGLADESH BIMAN':'BG','BIMAN BANGLADESH AIRLINES':'BG','BRITISH AIRWAYS':'BA','CATHAY PACIFIC':'CX',
  'CHINA EASTERN':'MU','CHINA SOUTHERN':'CZ','EMIRATES':'EK','ETIHAD':'EY','ETIHAD AIRWAYS':'EY',
  'FLY DUBAI':'FZ','FLYDUBAI':'FZ','GULF AIR':'GF','INDIGO':'6E','KUWAIT AIRWAYS':'KU',
  'MALAYSIA AIRLINES':'MH','OMAN AIR':'WY','QATAR AIRWAYS':'QR','SAUDI':'SV','SAUDIA':'SV',
  'SINGAPORE AIRLINES':'SQ','SRI LANKAN AIRLINES':'UL','THAI AIRWAYS':'TG','TURKISH AIRLINES':'TK',
  'US-BANGLA AIRLINES':'BS','US BANGLA AIRLINES':'BS','VISTARA':'UK','AIRASIA':'AK','AIR ASIA':'AK',
  'JAPAN AIRLINES':'JL','KOREAN AIR':'KE','LUFTHANSA':'LH','QANTAS':'QF','TIGER AIR':'TR',
  'NOVOAIR':'VQ','NOVO AIR':'VQ','SALAM AIR':'OV','AIR ARABIA EGYPT':'E5'
};
const normalizeAirlineCode = (value: string) => {
  const v=String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  if (/^[A-Z0-9]{2}$/.test(v)) return v;
  if (/^[A-Z]{3}$/.test(v)) {
    const icao: Record<string,string>={UAE:'EK',AAL:'AA',BAW:'BA',BGD:'BG',GFA:'GF',QTR:'QR',THA:'TG',TKY:'TK',SVA:'SV',OMA:'WY',MAS:'MH',VQI:'VQ'};
    return icao[v]||'';
  }
  return AIRLINE_CODES[v]||'';
};
const airlineLogoUrl=(value:string)=>{
  const code=normalizeAirlineCode(value);
  return code ? `https://cdn.jsdelivr.net/gh/spydogenesis/airlines-logo@latest/airlines-logo/200x200_v2/${code}.png` : '';
};
const inferAirlineCode=(value:string)=>{
  const v=String(value||'').trim().toUpperCase();
  const direct=normalizeAirlineCode(v); if(direct) return direct;
  const m=v.match(/\b([A-Z0-9]{2})\s*[- ]?\s*\d{2,4}\b/); return m?.[1]||'';
};

const blankSector = (): Sector => ({
  airline: '', flightNo: '', from: '', to: '', departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '', bookingClass: '', seat: '', baggage: ''
});

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c));

const cleanText = (raw: string) => raw
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

const detectValue = (text: string, patterns: RegExp[]) => {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, ' ');
  }
  return '';
};

const normalizePnr = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const normalizeTicket = (value: string) => value.replace(/[^\d]/g, '').slice(0, 13);
const normalizeDateInput = (value: string) => {
  const v = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\s/-]+([A-Z]{3,9})[,.\s/-]+(\d{2,4})$/i);
  if (!m) return v;
  const months: Record<string,string> = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',SEPT:'09',OCT:'10',NOV:'11',DEC:'12'};
  const mm = months[m[2].slice(0,3).toUpperCase()];
  if (!mm) return v;
  const yyyy = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${yyyy}-${mm}-${m[1].padStart(2,'0')}`;
};

const parseImportedText = (raw: string) => {
  const text=cleanText(raw);
  const lines=raw.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n')
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
  const airlinePnr=normalizePnr(detectValue(text,[/(?:AIRLINE\s*)?PNR\s*[:#-]?\s*([A-Z0-9]{5,8})/i,/(?:BOOKING|RESERVATION)\s*(?:REFERENCE|REF|CODE)\s*[:#-]?\s*([A-Z0-9]{5,8})/i,/RECORD\s*LOCATOR\s*[:#-]?\s*([A-Z0-9]{5,8})/i]));
  const gdsPnr=normalizePnr(detectValue(text,[/(?:GDS|GALILEO|AMADEUS|SABRE|TRAVELPORT|WORLDSPAN)\s*(?:PNR|LOCATOR|REFERENCE)\s*[:#-]?\s*([A-Z0-9]{5,8})/i,/(?:GALILEO|AMADEUS|SABRE|TRAVELPORT)\s*[:#-]?\s*([A-Z0-9]{5,8})/i]));
  const ticketNumber=normalizeTicket(detectValue(text,[/(?:E-?TICKET|TICKET)\s*(?:NUMBER|NO|NUM)?\s*[:#-]?\s*(\d{3}[-\s]?\d{10})/i,/\b(\d{3}-\d{10})\b/,/\b(\d{13})\b/]));
  const passport=detectValue(text,[/PASSPORT(?:\s*(?:NUMBER|NO|NUM))?\s*[:#-]?\s*([A-Z0-9]{6,12})/i]).toUpperCase();
  const passengerNames=[...text.matchAll(/(?:^|\s)(?:\d{1,2}\s+)?(?:PRIMARY\s+)?(?:MR|MRS|MS|MISS)\.?\s+([A-Z][A-Z .,'\/-]{1,}?)(?=\s+(?:ADULT|CHILD|INFANT)\b)/gi)].map(m=>m[1].trim().replace(/\s+/g,' '));
  const passenger=passengerNames.length ? [...new Set(passengerNames)].join(' / ') : detectValue(text,[/(?:PASSENGER|PAX|TRAVELER|TRAVELLER)\s*(?:NAME|NAME\/S)?\s*[:#-]\s*([A-Z][A-Z .,'\/-]{2,})/i,/(?:NAME|PAX NAME)\s*[:#-]\s*([A-Z][A-Z .,'\/-]{2,})/i,/\b(?:MR|MRS|MS|MISS)\.?\s+([A-Z][A-Z .,'\/-]{2,})/i]).replace(/\s+(?:TICKET|PNR|PASSPORT|AIRLINE|FLIGHT|ROUTE|DATE)\b.*$/i,'').trim();
  const airline=detectValue(text,[/(?:AIRLINE|CARRIER|MARKETING\s*CARRIER|OPERATING\s*CARRIER)\s*[:#-]\s*([A-Z][A-Z0-9 &.'-]{2,})/i,/(?:AIRLINE|CARRIER)\s*\|\s*([A-Z][A-Z0-9 &.'-]{2,})/i]).replace(/\s+(?:FLIGHT|PNR|TICKET|ROUTE|DATE)\b.*$/i,'').trim();
  const flightNo=detectValue(text,[/(?:FLIGHT|FLT)\s*(?:NUMBER|NO|NUM)?\s*[:#-]?\s*([A-Z0-9]{2,3}\s*[-]?\s*\d{2,4})/i,/\b([A-Z]{2}\s*[-]?\s*\d{2,4})\b/i]).replace(/\s+/g,'').toUpperCase();
  const namedRoute=text.match(/\b[A-Z][A-Z .'-]*\(([A-Z]{3})\)\s*(?:-|–|—|→|TO|\/)\s*[A-Z][A-Z .'-]*\(([A-Z]{3})\)\b/i);\n  const routeMatch=namedRoute || text.match(/\b([A-Z]{3})\s*(?:-|–|—|→|TO|\/)\s*([A-Z]{3})\b/i);
  const route=routeMatch?[routeMatch[1].toUpperCase(),routeMatch[2].toUpperCase()]:['',''];
  const issueDate=detectValue(text,[/(?:DATE\s*OF\s*ISSUE|ISSUE\s*DATE|ISSUED)\s*[:#-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i]);
  const date=detectValue(text,[/(?:DEPARTURE|DEPART|TRAVEL|FLIGHT)\s*(?:DATE)?\s*[:#-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,/\b(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{2,4})\b/i]);
  const time=detectValue(text,[/(?:DEPARTURE|DEPART|STD|ETD)\s*(?:TIME)?\s*[:#-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,/(?:DEP(?:ARTS)?|DEPARTURE)\s*[:#-]?[^0-9]{0,30}(\d{1,2}:\d{2})/i]);
  const sectors:Sector[]=[];
  const tripRoute = namedRoute ? [namedRoute[1].toUpperCase(), namedRoute[2].toUpperCase()] : route;
  const tripAirline = airline || (text.match(/\b(US-BANGLA AIRLINES|BIMAN BANGLADESH AIRLINES|AIR ARABIA|EMIRATES|QATAR AIRWAYS|SAUDIA|OMAN AIR|GULF AIR|ETIHAD AIRWAYS)\b/i)?.[1] || '');
  const tripFlight = detectValue(text,[/(?:FLIGHT\s*(?:NO|NUMBER)?|FLIGHT\s*INFO)\s*[-:#]?\s*(\d{2,4})/i]);
  const tripTimes=[...text.matchAll(/(?:^|\s)(\d{1,2}:\d{2})\s+(?:Departs|Departure):/gi)].map(m=>m[1]);
  const tripDates=[...text.matchAll(/\b(\d{1,2}\s+[A-Z]{3},?\s+\d{2,4})\b/gi)].map(m=>normalizeDateInput(m[1]));
  const arrivalTime=detectValue(text,[/\b(?:Arrival|Arrives)\s*:\s*[^0-9]{0,30}(\d{1,2}:\d{2})/i]);
  const baggage=detectValue(text,[/(?:ADT|CHD|INF)[^\n]{0,30}?→\s*(\d+(?:\.\d+)?)\s*(?:Kg|KG)/i,/(\d+(?:\.\d+)?)\s*(?:Kg|KG)\b/i]);
  const cabin=detectValue(text,[/\b(Economy|Business|First|Premium Economy)\b/i]);
  const addSector=(s:Sector)=>{const d=sectors.find(x=>x.flightNo===s.flightNo&&x.from===s.from&&x.to===s.to);if(d){Object.assign(d,Object.fromEntries(Object.entries(s).filter(([,v])=>v)));}else if(sectors.length<12)sectors.push(s);};
  const rowPattern=/^\s*\d{1,2}\s+([A-Z0-9]{2,3})\s*(\d{2,4})\s+([A-Z]{3})\s+([A-Z]{3})\s+([0-9A-Z]{3,9})(?:\s+([0-9:]{3,5}))?(?:\s+([0-9:]{3,5}))?/i;
  for(const line of lines){const m=line.match(rowPattern);if(m)addSector({...blankSector(),airline:m[1].toUpperCase(),flightNo:(m[1]+m[2]).toUpperCase(),from:m[3].toUpperCase(),to:m[4].toUpperCase(),departureDate:m[5],departureTime:m[6]||'',arrivalTime:m[7]||''});}
  const sectorPattern=/\b([A-Z]{2,3})\s*[-]?\s*(\d{2,4})\b[^A-Z0-9]{0,30}\b([A-Z]{3})\b[^A-Z0-9]{0,12}(?:-|–|—|→|TO|\/)\s*\b([A-Z]{3})\b/gi;
  let match:RegExpExecArray|null; while((match=sectorPattern.exec(text))&&sectors.length<12)addSector({...blankSector(),airline:match[1].toUpperCase(),flightNo:(match[1]+match[2]).toUpperCase(),from:match[3].toUpperCase(),to:match[4].toUpperCase(),departureDate:date,departureTime:time});
  if(!sectors.length && tripRoute[0] && tripRoute[1] && tripFlight){
    const inferredCode=normalizeAirlineCode(tripAirline)||inferAirlineCode(tripAirline)||'';
    addSector({...blankSector(),airline:inferredCode||tripAirline,flightNo:(inferredCode||'')+tripFlight,from:tripRoute[0],to:tripRoute[1],departureDate:tripDates[0]||normalizeDateInput(date),departureTime:tripTimes[0]||time,arrivalDate:tripDates[1]||tripDates[0]||'',arrivalTime,baggage,bookingClass:cabin||''});
  }
  if(!sectors.length){
    const flights=[...text.matchAll(/\b([A-Z]{2,3})\s*[-]?\s*(\d{2,4})\b/g)];
    const routes=[...text.matchAll(/\b([A-Z]{3})\s+(?:-|–|—|→|TO|\/)\s*([A-Z]{3})\b/gi)];
    const count=Math.min(12,Math.max(flights.length,routes.length,1));
    for(let i=0;i<count;i++)addSector({...blankSector(),airline:flights[i]?.[1]?.toUpperCase()||airline,flightNo:flights[i]?(flights[i][1]+flights[i][2]).toUpperCase():flightNo,from:routes[i]?.[1]?.toUpperCase()||route[0],to:routes[i]?.[2]?.toUpperCase()||route[1],departureDate:date,departureTime:time});
  }
  const firstAirline=sectors[0]?.airline||airline||inferAirlineCode(flightNo);
  const normalizedSectors=sectors.map(s=>({...s,departureDate:normalizeDateInput(s.departureDate),arrivalDate:normalizeDateInput(s.arrivalDate),bookingClass:s.bookingClass||cabin||'',baggage:s.baggage||baggage}));\n  return {airlinePnr,gdsPnr,ticketNumber,issueDate:normalizeDateInput(issueDate),passenger,passport,sectors:normalizedSectors.length?normalizedSectors:[{...blankSector(),airline:firstAirline,flightNo,from:route[0],to:route[1],departureDate:normalizeDateInput(date),departureTime:time}],rawText:text.slice(0,30000)};
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

  const detectedAirline = useMemo(() => { const s=sectors.find(x=>x.airline||x.flightNo); return s?.airline || inferAirlineCode(s?.flightNo||''); }, [sectors]);
  React.useEffect(() => { const u=airlineLogoUrl(detectedAirline); if(u) setLogo(u); }, [detectedAirline]);

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[2];
    setTemplateId(id); setAccent(t.accent); setHeader(t.header); setRadius(t.radius);
    setShowPassport(t.showPassport); setShowFrequentFlyer(t.showFrequentFlyer);
  };

  const applyParsed = (parsed: ReturnType<typeof parseImportedText>) => {
    if (parsed.airlinePnr) setAirlinePnr(parsed.airlinePnr);
    if (parsed.gdsPnr) setGdsPnr(parsed.gdsPnr);
    if (parsed.ticketNumber) setTicketNumber(parsed.ticketNumber);
    if (parsed.issueDate) setIssueDate(parsed.issueDate);
    if (parsed.passenger) setPassenger(parsed.passenger);
    if (parsed.passport) setPassport(parsed.passport);
    const parsedLogo=airlineLogoUrl(parsed.sectors.find(s=>s.airline)?.airline||''); if(parsedLogo) setLogo(parsedLogo);
    if (parsed.sectors.some(s => Object.values(s).some(Boolean))) setSectors(parsed.sectors);
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
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ dataBase64, filename: file.name })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'PDF extraction failed');
        applyParsed(parseImportedText(String(result.text || '')));
        setImportStatus('PDF data extracted successfully. Please review all fields before generating the e-ticket.');
        return;
      }

      if (file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
        setImportStatus('Reading ticket image with OCR…');
        const worker = await createWorker('eng');
        try {
          const { data } = await worker.recognize(file);
          const ocrText = String(data.text || '').trim();
          if (!ocrText) throw new Error('No readable text was found in the image. Try a clearer ticket image.');
          applyParsed(parseImportedText(ocrText));
          setImportStatus('JPG / PNG / GIF ticket OCR completed. Detected fields have been filled; please review them before generating.');
        } finally {
          await worker.terminate();
        }
        return;
      }

      const raw = await file.text();
      if (!raw.trim()) throw new Error('The uploaded HTML/text file is empty.');
      applyParsed(parseImportedText(raw));
      setImportStatus('HTML ticket data extracted successfully. Please review the detected fields before generating.');
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Could not read this ticket automatically. Please enter the information manually.');
    }
  };

  const importLink = async () => {
    const url = window.prompt('Paste a public ticket / booking URL');
    if (!url) return;
    let parsedUrl: URL;
    try { parsedUrl = new URL(url.trim()); } catch { setImportStatus('Please enter a valid public http(s) ticket URL.'); return; }
    if (!/^https?:$/.test(parsedUrl.protocol)) { setImportStatus('Only public http(s) ticket links are supported.'); return; }

    setImportStatus('Reading public ticket link…');
    try {
      let raw = '';
      try {
        const direct = await fetch(parsedUrl.href, { credentials: 'omit' });
        if (!direct.ok) throw new Error('Direct fetch failed');
        raw = await direct.text();
      } catch {
        const proxy = await fetch('https://r.jina.ai/' + parsedUrl.href, { headers: { Accept: 'text/plain' } });
        if (!proxy.ok) throw new Error('The public ticket link could not be read. The site may require login or block automated access.');
        raw = await proxy.text();
      }
      if (!raw.trim()) throw new Error('The ticket link returned no readable content.');
      const parsed = parseImportedText(raw);
      applyParsed(parsed);
      const detected = [parsed.airlinePnr, parsed.gdsPnr, parsed.ticketNumber, parsed.passenger, ...parsed.sectors.flatMap(s => [s.flightNo, s.from, s.to])].filter(Boolean).length;
      if (!detected) throw new Error('The link was opened, but no standard ticket fields could be detected. Download the ticket as PDF/image and upload it instead.');
      setImportStatus('Public ticket link imported successfully. Detected fields have been filled; please review them before generating.');
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Unable to read this public ticket link. Download the ticket and use Upload instead.');
    }
  };

  const saveCustomTemplate = () => {
    localStorage.setItem('siam_ticket_custom_template', JSON.stringify({ accent, header, radius, showPassport, showFrequentFlyer, showBaggage, showTicketNumber, showGdsPnr, customTitle, customFooter }));
    setTemplateId('custom'); setImportStatus('Custom ticket template saved on this device.');
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
            <div><div className="text-xs font-extrabold text-slate-900">IMPORT / AUTO READ TICKET</div><div className="text-[11px] text-slate-500 mt-1">PDF, HTML, JPG, PNG and GIF tickets can be read automatically. Public links use direct access first and a public-reader fallback when browser CORS blocks the ticket page.</div></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-bold"><Upload className="w-4 h-4"/> Upload PDF / JPG / PNG / GIF / HTML</button>
              <input ref={fileRef} type="file" hidden accept=".pdf,.html,.htm,.txt,image/jpeg,image/png,image/gif,image/webp" onChange={e=>{const f=e.target.files?.[0]; if(f) void importFile(f); e.currentTarget.value='';}} />
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
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Airline Logo (Automatic)</span><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-h-[46px]">{logo ? <img src={logo} alt="Airline logo" className="h-8 max-w-[120px] object-contain" onError={()=>setLogo('')} /> : <span className="text-xs text-slate-400">Enter airline code/name in a sector field.</span>}</div></label>
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
              {field('Airline / IATA Code',s.airline,v=>updateSector(i,'airline',v))}{field('Flight Number',s.flightNo,v=>updateSector(i,'flightNo',v))}
              {field('From',s.from,v=>updateSector(i,'from',v))}{field('To',s.to,v=>updateSector(i,'to',v))}
              {field('Departure Date',s.departureDate,v=>updateSector(i,'departureDate',v))}{field('Departure Time',s.departureTime,v=>updateSector(i,'departureTime',v),'time')}
              {field('Arrival Date',s.arrivalDate,v=>updateSector(i,'arrivalDate',v))}{field('Arrival Time',s.arrivalTime,v=>updateSector(i,'arrivalTime',v),'time')}
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
