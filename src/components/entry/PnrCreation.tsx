import React, { useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { ArrowLeft, Printer, Plus, Ticket, Trash2, Upload } from 'lucide-react';
import siamAirLogo from '../../assets/images/siam_air_logo_1790325286013.jpg';
import { useApp } from '../../context/AppContext';

interface PnrCreationProps { onClose: () => void; }

type ImportedPassenger = { name: string; passport: string; ticketNumber: string; };

type Sector = {
  airline: string; flightNo: string; from: string; to: string;
  departureDate: string; departureTime: string; arrivalDate: string; arrivalTime: string;
  bookingClass: string; seat: string; baggage: string;
};

const FIXED_TICKET_TEMPLATE = { id: 'siam-v8', name: 'SIAM AIR Ticket View / Print — V8', accent: '#15803d', header: '#0f766e', radius: '12px' };

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
const airlineLogoFallbackUrl=(value:string)=>{
  const code=normalizeAirlineCode(value);
  return code ? `https://images.kiwi.com/airlines/64/${code}.png` : '';
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
  // Ticket PDFs come from many providers/GDSs and often lose table columns during PDF text extraction.
  // Parse by labels and local line context first; never invent a value when it is not present.
  const source = String(raw || '');
  const text = cleanText(source);
  const lines = source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split(/\r?\n/)
    .map(x => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const first = (patterns: RegExp[], input = text) => {
    for (const p of patterns) {
      const m = input.match(p);
      if (m?.[1]) return m[1].trim().replace(/\s+/g, ' ');
    }
    return '';
  };
  const dateValue = (v: string) => {
    const s = String(v || '').trim().replace(/,/g, '');
    if (!s) return '';
    const compact = s.match(/^(\d{1,2})([A-Z]{3})(\d{2,4})$/i);
    if (compact) return normalizeDateInput(\`\${compact[1]} \${compact[2]} \${compact[3]}\`);
    return normalizeDateInput(s);
  };
  const datesIn = (input: string) => {
    const out: string[] = [];
    const patterns = [
      /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
      /\b\d{1,2}\s+[A-Z]{3,9}\s*,?\s*\d{2,4}\b/gi,
      /\b\d{1,2}[A-Z]{3}\d{2,4}\b/gi
    ];
    for (const p of patterns) for (const m of input.matchAll(p)) {
      const d = dateValue(m[0]);
      if (d && !out.includes(d)) out.push(d);
    }
    return out;
  };
  const timesIn = (input: string) =>
    [...input.matchAll(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?\b/gi)].map(m => m[0].trim());

  const airlineNameFromCode = (code: string) => {
    const c = normalizeAirlineCode(code);
    if (!c) return '';
    const names: Record<string,string> = {
      G9:'Air Arabia', '3L':'Air Arabia Abu Dhabi', BS:'US-Bangla Airlines', BG:'Biman Bangladesh Airlines',
      EK:'Emirates', EY:'Etihad Airways', FZ:'Flydubai', QR:'Qatar Airways', SV:'Saudia', OV:'SalamAir',
      WY:'Oman Air', GF:'Gulf Air', KU:'Kuwait Airways', MH:'Malaysia Airlines', AI:'Air India',
      IX:'Air India Express', 6E:'IndiGo', SQ:'Singapore Airlines', UL:'SriLankan Airlines',
      TK:'Turkish Airlines', TG:'Thai Airways', CX:'Cathay Pacific', BA:'British Airways'
    };
    return names[c] || c;
  };

  const airlinePnr = normalizePnr(first([
    /(?:AIRLINE\s*)?(?:PNR|BOOKING\s*PNR)\s*[:#-]\s*([A-Z0-9]{5,8})/i,
    /(?:BOOKING|RESERVATION)\s*(?:REFERENCE|REF|CODE)\s*[:#-]\s*([A-Z0-9]{5,8})/i,
    /(?:AIRLINE\s+)?PNR\s*[:#-]?\s*([A-Z0-9]{5,8})\b/i,
    /RECORD\s*LOCATOR\s*[:#-]?\s*([A-Z0-9]{5,8})\b/i
  ]));
  const gdsPnr = normalizePnr(first([
    /(?:GALILEO|AMADEUS|SABRE|TRAVELPORT|WORLDSPAN|GDS)\s*(?:PNR|LOCATOR|REFERENCE|REF)\s*[:#-]?\s*([A-Z0-9]{5,8})/i,
    /\b(?:GALILEO|AMADEUS|SABRE|TRAVELPORT)\s*[:#-]\s*([A-Z0-9]{5,8})\b/i
  ]));

  const ticketNumber = normalizeTicket(first([
    /(?:E[-\s]?TICKET|ELECTRONIC\s*TICKET|TICKET|DOCUMENT)\s*(?:NUMBER|NO|NUM|#)?\s*[:#-]?\s*(\d{3}[-\s]?\d{10})\b/i,
    /\b(\d{3}[-\s]\d{10})\b/,
    /\b(\d{13})\b/
  ]));

  // Extract passenger-specific rows first. Ticket numbers are paired by local row context;
  // never reuse the first ticket number for every passenger.
  const passengerRecords: ImportedPassenger[] = [];
  const ticketTokens = [...text.matchAll(/\b(\d{3}[-\s]?\d{10}|\d{13})\b/g)].map(m => normalizeTicket(m[1]));
  const nameCandidates = [...text.matchAll(/(?:^|\s)(?:\d{1,2}\s+)?(?:PRIMARY\s+)?(?:MR|MRS|MS|MISS|DR)\.?\s+([A-Z][A-Z .,'\/-]{1,80}?)(?=\s+(?:ADULT|CHILD|INFANT|ADT|CHD|INF)\b)/gi)]
    .map(m => m[1].trim().replace(/\s+/g,' '));
  const uniqueNames = [...new Set(nameCandidates)];
  const namePositions = [...text.matchAll(/(?:^|\s)(?:\d{1,2}\s+)?(?:PRIMARY\s+)?(?:MR|MRS|MS|MISS|DR)\.?\s+[A-Z][A-Z .,'\/-]{1,80}?\s+(?:ADULT|CHILD|INFANT|ADT|CHD|INF)\b/gi)].map(m=>m.index||0);
  uniqueNames.forEach((name, idx) => {
    const pos = namePositions[idx] ?? 0;
    const windowText = text.slice(Math.max(0,pos-180), Math.min(text.length,pos+420));
    const localTicket = windowText.match(/\b(\d{3}[-\s]?\d{10}|\d{13})\b/);
    const localPassport = windowText.match(/(?:PASSPORT|PP)\s*(?:NUMBER|NO|NUM|#)?\s*[:#-]?\s*([A-Z0-9]{6,12})\b/i);
    passengerRecords.push({name, passport: (localPassport?.[1]||'').toUpperCase(), ticketNumber: localTicket ? normalizeTicket(localTicket[1]) : (ticketTokens[idx]||'')});
  });

  const passport = first([
    /(?:PASSPORT|PP)\s*(?:NUMBER|NO|NUM|#)?\s*[:#-]\s*([A-Z0-9]{6,12})\b/i,
    /\bPASSPORT\s+([A-Z0-9]{6,12})\b/i
  ]).toUpperCase();

  // Passenger extraction is intentionally bounded by passenger-type/next-field markers.
  const passengerNames: string[] = [];
  for (const m of text.matchAll(/(?:^|\s)(?:\d{1,2}\s+)?(?:PRIMARY\s+)?(?:MR|MRS|MS|MISS|DR)\.?\s+([A-Z][A-Z .,'\/-]{1,80}?)(?=\s+(?:ADULT|CHILD|INFANT|ADT|CHD|INF)\b)/gi)) {
    const n = m[1].trim().replace(/\s+/g, ' ');
    if (n && !passengerNames.includes(n)) passengerNames.push(n);
  }
  const passenger = passengerNames.length
    ? passengerNames.join(' / ')
    : first([
        /(?:PASSENGER|PAX|TRAVELER|TRAVELLER)\s*(?:NAME|NAMES?)?\s*[:#-]\s*([A-Z][A-Z .,'\/-]{2,80})/i,
        /\b(?:MR|MRS|MS|MISS|DR)\.?\s+([A-Z][A-Z .,'\/-]{2,80}?)(?=\s+(?:TICKET|PNR|PASSPORT|AIRLINE|FLIGHT|ROUTE|DATE|BOOKING)\b)/i
      ]).trim();

  const knownAirlinePattern = /\b(US[-\s]?BANGLA\s+AIRLINES|BIMAN\s+BANGLADESH\s+AIRLINES|AIR\s+ARABIA(?:\s+ABU\s+DHABI)?|EMIRATES|ETIHAD\s+AIRWAYS?|FLY\s*DUBAI|QATAR\s+AIRWAYS?|SAUDIA|OMAN\s+AIR|GULF\s+AIR|KUWAIT\s+AIRWAYS?|MALAYSIA\s+AIRLINES|SINGAPORE\s+AIRLINES|TURKISH\s+AIRLINES|THAI\s+AIRWAYS?|AIR\s+INDIA(?:\s+EXPRESS)?|INDIGO|SRI\s+LANKAN\s+AIRLINES?|BRITISH\s+AIRWAYS)\b/i;
  const airline = first([
    /(?:MARKETING\s+|OPERATING\s+)?(?:AIRLINE|CARRIER)\s*[:#-]\s*([A-Z][A-Z0-9 &.'-]{2,80})/i,
    /(?:AIRLINE|CARRIER)\s*\|\s*([A-Z][A-Z0-9 &.'-]{2,80})/i
  ]).replace(/\s+(?:FLIGHT|PNR|TICKET|ROUTE|DATE|PASSENGER)\b.*$/i, '').trim()
    || knownAirlinePattern.exec(text)?.[1]?.trim() || '';

  // Flight number: accept IATA/ICAO prefixes only when adjacent to a 2-4 digit number.
  const flightMatches = [...text.matchAll(/\b([A-Z0-9]{2,3})\s*[-/]?\s*(\d{2,4})\b/g)]
    .map(m => ({ raw: m[0], prefix: m[1].toUpperCase(), number: m[2], code: normalizeAirlineCode(m[1]) }))
    .filter(x => x.code);
  const explicitFlight = first([
    /(?:FLIGHT|FLT)\s*(?:NUMBER|NO|NUM|#)?\s*[:#-]?\s*([A-Z0-9]{2,3}\s*[-/]?\s*\d{2,4})/i,
    /(?:FLIGHT\s+INFO|FLIGHT\s+NO)\s*[-:#]?\s*(?:[A-Z]{2,3}\s*)?(\d{2,4})/i
  ]).replace(/\s+/g,'').toUpperCase();
  const flightCode = explicitFlight || (flightMatches[0] ? flightMatches[0].code + flightMatches[0].number : '');
  const carrierCode = normalizeAirlineCode(airline) || flightMatches[0]?.code || '';

  const namedRoute = text.match(/\b[A-Z][A-Z .'-]{1,50}\(([A-Z]{3})\)\s*(?:-|–|—|→|TO|\/)\s*[A-Z][A-Z .'-]{1,50}\(([A-Z]{3})\)\b/i);
  const explicitRoute = text.match(/\b([A-Z]{3})\s*(?:-|–|—|→|TO|\/)\s*([A-Z]{3})\b/i);
  const route = namedRoute ? [namedRoute[1].toUpperCase(), namedRoute[2].toUpperCase()] : explicitRoute ? [explicitRoute[1].toUpperCase(), explicitRoute[2].toUpperCase()] : ['', ''];

  const issueDate = dateValue(first([
    /(?:DATE\s*OF\s*ISSUE|ISSUE\s*DATE|DATE\s*ISSUED|ISSUED)\s*[:#-]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+[A-Z]{3,9},?\s+\d{2,4})/i
  ]));

  const globalCabin = first([/\b(PREMIUM\s+ECONOMY|PREMIUM|ECONOMY|BUSINESS|FIRST)\b/i]);
  const globalBaggage = first([
    /(?:BAGGAGE|BAG|ALLOWANCE)\s*[:#-]?\s*(\d+(?:\.\d+)?)\s*(?:KG|KGS)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:KG|KGS)\b/i
  ]);

  const sectors: Sector[] = [];
  const addSector = (s: Sector) => {
    const normalized: Sector = {
      ...blankSector(),
      ...s,
      airline: normalizeAirlineCode(s.airline) || String(s.airline || '').toUpperCase(),
      flightNo: String(s.flightNo || '').replace(/[\s/-]+/g, '').toUpperCase(),
      from: String(s.from || '').toUpperCase(),
      to: String(s.to || '').toUpperCase(),
      departureDate: dateValue(s.departureDate),
      arrivalDate: dateValue(s.arrivalDate)
    };
    if (!normalized.flightNo && !normalized.from && !normalized.to) return;
    const same = sectors.find(x => normalized.flightNo && x.flightNo === normalized.flightNo && x.from === normalized.from && x.to === normalized.to);
    if (same) Object.assign(same, Object.fromEntries(Object.entries(normalized).filter(([,v]) => Boolean(v))));
    else sectors.push(normalized);
  };

  // High-confidence row parser for provider/GDS text such as:
  // "BS307 19:00 Dhaka (DAC) Singapore (SIN) 25-Jun-26 22:00 26-Jun-26 04:00"
  const rowFlight = /\b([A-Z0-9]{2,3})\s*[-/]?\s*(\d{2,4})\b/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fm = line.match(rowFlight);
    if (!fm) continue;
    const code = normalizeAirlineCode(fm[1]);
    if (!code) continue;

    const nearby = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)).join(' ');
    const routeM = nearby.match(/\b[A-Z][A-Z .'-]{1,40}\(([A-Z]{3})\)\s*(?:-|→|TO)?\s*[A-Z][A-Z .'-]{1,40}\(([A-Z]{3})\)\b/i)
      || nearby.match(/\b([A-Z]{3})\s*(?:-|→|TO|\/)\s*([A-Z]{3})\b/i);
    const ds = datesIn(nearby);
    const ts = timesIn(nearby);
    const bag = first([/\b(\d+(?:\.\d+)?)\s*(?:KG|KGS)\b/i], nearby);
    const cabin = first([/\b(PREMIUM\s+ECONOMY|PREMIUM|ECONOMY|BUSINESS|FIRST)\b/i], nearby);
    const cls = nearby.match(/\b(?:CLASS|CLS|BOOKING\s*CLASS)\s*[:#-]?\s*([A-Z0-9])\b/i)?.[1] || '';
    addSector({
      airline: code,
      flightNo: code + fm[2],
      from: routeM?.[1]?.toUpperCase() || '',
      to: routeM?.[2]?.toUpperCase() || '',
      departureDate: ds[0] || '',
      departureTime: ts[0] || '',
      arrivalDate: ds[1] || '',
      arrivalTime: ts[1] || '',
      bookingClass: cls || cabin,
      baggage: bag ? bag + ' KG' : ''
    });
  }

  // Triplover-style: carrier/flight line followed by separate Departs:/Arrival: lines.
  const depLineIndex = lines.findIndex(l => /\b(?:Departs|Departure)\s*:/i.test(l));
  const arrLineIndex = lines.findIndex(l => /\b(?:Arrival|Arrives)\s*:/i.test(l));
  if (depLineIndex >= 0 || arrLineIndex >= 0) {
    const depLine = depLineIndex >= 0 ? lines[depLineIndex] : '';
    const arrLine = arrLineIndex >= 0 ? lines[arrLineIndex] : '';
    const depRoute = depLine.match(/\(([A-Z]{3})\)/)?.[1] || route[0];
    const arrRoute = arrLine.match(/\(([A-Z]{3})\)/)?.[1] || route[1];
    const depDate = datesIn(depLine)[0] || datesIn(lines.slice(Math.max(0, depLineIndex - 2), depLineIndex + 1).join(' '))[0] || '';
    const arrDate = datesIn(arrLine)[0] || datesIn(lines.slice(Math.max(0, arrLineIndex - 2), arrLineIndex + 1).join(' '))[0] || '';
    const depTime = timesIn(depLine)[0] || '';
    const arrTime = timesIn(arrLine)[0] || '';
    const carrierFlightLine = lines.find(l => /\b(?:Flight\s+No|Flight\s+Number)\s*[-:#]?\s*\d{2,4}\b/i.test(l)) || '';
    const carrier = normalizeAirlineCode(airline) || carrierCode;
    const number = carrierFlightLine.match(/\b(?:Flight\s+No|Flight\s+Number)\s*[-:#]?\s*(\d{2,4})\b/i)?.[1] || flightMatches[0]?.number || explicitFlight.replace(/^[A-Z0-9]{2,3}/,'');
    if (carrier && number) {
      addSector({
        airline: carrier,
        flightNo: carrier + number,
        from: depRoute,
        to: arrRoute,
        departureDate: depDate,
        departureTime: depTime,
        arrivalDate: arrDate,
        arrivalTime: arrTime,
        bookingClass: globalCabin,
        baggage: globalBaggage ? globalBaggage + ' KG' : ''
      });
    }
  }

  // Explicit inline flight + route pattern, used by many OTA/GDS exports.
  for (const m of text.matchAll(/\b([A-Z0-9]{2,3})\s*[-/]?\s*(\d{2,4})\b[\s:,-]{0,30}([A-Z]{3})\s*(?:-|–|—|→|TO|\/)\s*([A-Z]{3})\b/gi)) {
    const code = normalizeAirlineCode(m[1]);
    if (!code) continue;
    const context = text.slice(Math.max(0, (m.index || 0) - 250), Math.min(text.length, (m.index || 0) + 500));
    const ds = datesIn(context);
    const ts = timesIn(context);
    addSector({
      airline: code, flightNo: code + m[2], from: m[3], to: m[4],
      departureDate: ds[0] || '', departureTime: ts[0] || '',
      arrivalDate: ds[1] || '', arrivalTime: ts[1] || '',
      bookingClass: first([/\b(PREMIUM\s+ECONOMY|PREMIUM|ECONOMY|BUSINESS|FIRST)\b/i], context),
      baggage: first([/\b(\d+(?:\.\d+)?)\s*(?:KG|KGS)\b/i], context) ? first([/\b(\d+(?:\.\d+)?)\s*(?:KG|KGS)\b/i], context) + ' KG' : ''
    });
  }

  // Last-resort single sector only when we have a trustworthy flight/route combination.
  if (!sectors.length && (flightCode || flightMatches[0]) && (route[0] && route[1])) {
    const code = carrierCode || flightMatches[0]?.code || '';
    const number = explicitFlight.match(/\d{2,4}$/)?.[0] || flightMatches[0]?.number || '';
    if (code && number) addSector({
      airline: code, flightNo: code + number, from: route[0], to: route[1],
      departureDate: dateValue(first([/(?:DEPARTURE|DEPART|TRAVEL|FLIGHT)\s*(?:DATE)?\s*[:#-]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+[A-Z]{3,9}\s+\d{2,4})/i])),
      departureTime: first([/(?:DEPARTURE|DEPART|STD|ETD)\s*(?:TIME)?\s*[:#-]?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i]),
      bookingClass: globalCabin,
      baggage: globalBaggage ? globalBaggage + ' KG' : ''
    });
  }

  const fallbackSector: Sector = {
    ...blankSector(),
    airline: sectors[0]?.airline || carrierCode || '',
    flightNo: sectors[0]?.flightNo || flightCode,
    from: sectors[0]?.from || route[0],
    to: sectors[0]?.to || route[1],
    departureDate: sectors[0]?.departureDate || '',
    departureTime: sectors[0]?.departureTime || '',
    arrivalDate: sectors[0]?.arrivalDate || '',
    arrivalTime: sectors[0]?.arrivalTime || '',
    bookingClass: sectors[0]?.bookingClass || globalCabin,
    baggage: sectors[0]?.baggage || (globalBaggage ? globalBaggage + ' KG' : '')
  };

  return {
    airlinePnr,
    gdsPnr,
    ticketNumber,
    issueDate,
    passenger,
    passport,
    passengers: passengerRecords,
    sectors: sectors.length ? sectors.slice(0, 12) : [fallbackSector],
    rawText: text.slice(0, 30000)
  };
};

export const PnrCreation: React.FC<PnrCreationProps> = ({ onClose }) => {
  const { settings } = useApp();
  const [airlinePnr, setAirlinePnr] = useState('');
  const [gdsPnr, setGdsPnr] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [importedPassengers, setImportedPassengers] = useState<ImportedPassenger[]>([]);
  const [issueDate, setIssueDate] = useState('');
  const [passenger, setPassenger] = useState('');
  const [passport, setPassport] = useState('');
  const [frequentFlyer, setFrequentFlyer] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  // Business logo is controlled by Admin > Business Info. Airline logos are only metadata; never replace the admin logo.
  const [logo, setLogo] = useState(settings.logoUrl || siamAirLogo);
  const [sectors, setSectors] = useState<Sector[]>([blankSector()]);
  const templateId = FIXED_TICKET_TEMPLATE.id;
  const accent = FIXED_TICKET_TEMPLATE.accent;
  const header = FIXED_TICKET_TEMPLATE.header;
  const radius = FIXED_TICKET_TEMPLATE.radius;
  const [showPassport, setShowPassport] = useState(true);
  const [showFrequentFlyer, setShowFrequentFlyer] = useState(true);
  const [showBaggage, setShowBaggage] = useState(true);
  const [showTicketNumber, setShowTicketNumber] = useState(true);
  const [showGdsPnr, setShowGdsPnr] = useState(true);
  const [customTitle, setCustomTitle] = useState('SIAM AIR AND DIGITAL SERVICE');
  const [customFooter, setCustomFooter] = useState('Ticket information only — no accounting connection.');
  const [importStatus, setImportStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const detectedAirline = useMemo(() => {
    const s=sectors.find(x=>x.airline||x.flightNo);
    return normalizeAirlineCode(s?.airline||'') || inferAirlineCode(s?.flightNo||'') || s?.airline || '';
  }, [sectors]);
  React.useEffect(() => { setLogo(settings.logoUrl || siamAirLogo); }, [settings.logoUrl]);


  const applyParsed = (parsed: ReturnType<typeof parseImportedText>) => {
    // Each import is a fresh ticket. Clear fields that are absent instead of leaving
    // stale values from a previously imported ticket.
    setAirlinePnr(parsed.airlinePnr || '');
    setGdsPnr(parsed.gdsPnr || '');
    setTicketNumber(parsed.ticketNumber || '');
    setIssueDate(parsed.issueDate || '');
    setPassenger(parsed.passenger || '');
    setPassport(parsed.passport || '');
    setImportedPassengers(parsed.passengers?.length ? parsed.passengers : (parsed.passenger || parsed.ticketNumber ? [{name: parsed.passenger || '', passport: parsed.passport || '', ticketNumber: parsed.ticketNumber || ''}] : []));
    setSectors(parsed.sectors?.length ? parsed.sectors : [blankSector()]);
  };

  const updateSector = (index: number, key: keyof Sector, value: string) =>
    setSectors(prev => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));

  const clearAll = () => {
    setAirlinePnr(''); setGdsPnr(''); setTicketNumber(''); setIssueDate(''); setPassenger('');
    setPassport(''); setFrequentFlyer(''); setImportedPassengers([]); setStatus('CONFIRMED'); setLogo(''); setSectors([blankSector()]);
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


  const printable = useMemo(() => ({ airlinePnr, gdsPnr, ticketNumber, issueDate, passenger, passport, frequentFlyer, status, logo, sectors }), [airlinePnr,gdsPnr,ticketNumber,issueDate,passenger,passport,frequentFlyer,status,logo,sectors]);

  const printTicket = () => {
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    const logoSrc = settings.logoUrl || siamAirLogo;
    const people = importedPassengers.length ? importedPassengers : [{ name: passenger, passport, ticketNumber }];
    const pages = people.map((person, personIndex) => {
      const rows = printable.sectors.map(s => '<tr>' +
        '<td><div class="flight-airline"><img src="' + escapeHtml(airlineLogoUrl(s.airline || s.flightNo)) + '" onerror="this.onerror=null;this.src=' + JSON.stringify(airlineLogoFallbackUrl(s.airline || s.flightNo)) + ';this.style.display=this.src?\'block\':\'none\';" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:4px" />' + escapeHtml(s.airline || '-') + '</div><div class="flight-no">' + escapeHtml(s.flightNo || '-') + '</div></td>' +
        '<td class="route"><b>' + escapeHtml(s.from || '-') + '</b></td><td class="route"><b>' + escapeHtml(s.to || '-') + '</b></td>' +
        '<td><div class="date">' + escapeHtml(s.departureDate || '-') + '</div><div class="time">' + escapeHtml(s.departureTime || '-') + '</div></td>' +
        '<td><div class="date">' + escapeHtml(s.arrivalDate || '-') + '</div><div class="time">' + escapeHtml(s.arrivalTime || '-') + '</div></td>' +
        '<td>' + escapeHtml(s.seat || '-') + '</td><td class="info">Baggage : ' + escapeHtml(s.baggage || '-') + '<br>Class : ' + escapeHtml(s.bookingClass || '-') + '</td></tr>').join('');
      const qr = settings.whatsappQrCode ? '<div class="qr"><img src="' + escapeHtml(settings.whatsappQrCode) + '" /><span>WhatsApp</span></div>' : '';
      return '<div class="ticket' + (personIndex ? ' page-break' : '') + '"><div class="tp-head"><div class="tp-agency"><b>' + escapeHtml(settings.name || 'SIAM AIR AND DIGITAL SERVICE') + '</b><br>' + escapeHtml(settings.address || '') + '<br>Mobile: ' + escapeHtml(settings.mobile || '') + (settings.email ? '<br>Email: ' + escapeHtml(settings.email) : '') + '</div><div class="tp-right"><div class="brand"><img src="' + escapeHtml(logoSrc) + '" /><div>' + escapeHtml(settings.tagline || '') + '</div></div></div></div>' +
      '<div class="tp-title">Electronic Ticket</div><div class="tp-section-title">Passenger Information</div>' +
      '<table class="tp-table"><tr><th>Passenger Information</th><th>Passport Number</th><th>Frequent Flyer Number</th><th>Ticket</th></tr><tr><td>' + escapeHtml(person.name || '-') + '</td><td>' + escapeHtml(person.passport || '-') + '</td><td>' + escapeHtml(printable.frequentFlyer || '-') + '</td><td>' + escapeHtml(person.ticketNumber || '-') + '</td></tr></table>' +
      '<table class="tp-table" style="margin-top:10px"><tr><th>Airline PNR</th><th>Galileo PNR</th><th>Date of Issue</th><th>Status</th></tr><tr><td>' + escapeHtml(printable.airlinePnr || '-') + '</td><td>' + escapeHtml(printable.gdsPnr || '-') + '</td><td>' + escapeHtml(printable.issueDate || '-') + '</td><td>' + escapeHtml(printable.status || '-') + '</td></tr></table>' +
      '<div class="tp-section-title">Itinerary Information</div><table class="tp-table itin"><tr><th>Flight #</th><th>From</th><th>To</th><th>Depart</th><th>Arrive</th><th>Seat</th><th>Info</th></tr>' + rows + '</table>' +
      '<div class="tp-notes"><b>Notes:</b><br>Baggage allowance and carrier conditions are subject to the airline and fare rules.</div><div class="tp-important"><b>IMPORTANT INFORMATION FOR TRAVELERS WITH ELECTRONIC TICKETS - PLEASE READ:</b><br>Carriage and other services provided by the carrier are subject to the conditions of carriage of the issuing carrier. Please carry valid passport, visa and other required travel documents.</div>' + qr + '</div>';
    }).join('');
    w.document.write('<!doctype html><html><head><title>SIAM AIR E-Ticket</title><style>' +
      '@page{size:A4 portrait;margin:0}body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page-break{page-break-before:always}.ticket{width:210mm;min-height:297mm;box-sizing:border-box;padding:13mm 12mm 10mm;background:#fff}.tp-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:25px}.tp-agency{font-size:11px;line-height:1.28}.tp-agency b{font-size:16px}.tp-right{display:flex;align-items:center;justify-content:flex-end;min-width:190px}.brand{text-align:center;font-size:11px;font-weight:700;max-width:190px}.brand img{height:58px;width:58px;object-fit:contain;border-radius:10px;background:#fff;padding:3px;display:block;margin:0 auto 4px}.tp-title{font-size:20px;font-weight:700;margin:0 0 13px}.tp-section-title{font-size:18px;font-weight:700;margin:13px 0 7px}.tp-table{width:100%;border-collapse:collapse;table-layout:fixed}.tp-table th,.tp-table td{border:1px solid #333;padding:4px;vertical-align:top;font-size:10px;line-height:1.15}.tp-table th{background:#b9e3e9;text-align:left;font-weight:700}.tp-table td{height:28px}.itin th:nth-child(1){width:12%}.itin th:nth-child(2){width:17%}.itin th:nth-child(3){width:17%}.itin th:nth-child(4){width:14%}.itin th:nth-child(5){width:14%}.itin th:nth-child(6){width:5%}.itin th:nth-child(7){width:21%}.itin td{height:90px}.flight-airline{font-size:11px;font-weight:700;display:flex;align-items:center;gap:3px}.flight-no{font-size:13px;font-weight:700;margin-top:13px}.route b{font-size:11px}.date{font-weight:700;font-size:11px}.time{font-size:14px;font-weight:700;margin-top:8px}.info{font-size:10px;line-height:1.25}.tp-notes{font-size:9px;line-height:1.18;margin-top:34px}.tp-important{font-size:9px;line-height:1.15;margin-top:18px}.qr{margin-top:18px;display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700}.qr img{width:72px;height:72px;object-fit:contain}</style></head><body>' + pages + '<script>window.onload=()=>window.print()</script></body></html>');
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

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-xs font-extrabold text-slate-900">SIAM AIR TICKET VIEW / PRINT</div><div className="text-[11px] text-slate-600 mt-1">Fixed V8 ticket view and print format from the supplied calculator. Previous ticket templates are removed.</div></div>
            <span className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-[10px] font-extrabold">SIAM AIR V8</span>
          </div>
        </section>

        <section><div className="text-xs font-extrabold text-slate-900 mb-3">E-TICKET INFORMATION</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {field('Airline PNR',airlinePnr,setAirlinePnr)}{field('Galileo / GDS PNR',gdsPnr,setGdsPnr)}
            {field('Ticket Number',ticketNumber,setTicketNumber)}{field('Date of Issue',issueDate,setIssueDate,'date')}
            {field('Passenger Name',passenger,setPassenger)}{field('Passport Number',passport,setPassport)}
            {field('Frequent Flyer Number',frequentFlyer,setFrequentFlyer)}
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Ticket Status</span><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>CONFIRMED</option><option>REISSUED</option><option>CANCELLED</option><option>REFUNDED</option><option>VOID</option></select></label>
            <label className="block"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">SIAM AIR Business Logo</span><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-h-[46px]">{logo ? <img src={logo} alt="SIAM AIR business logo" className="h-8 max-w-[120px] object-contain" /> : <span className="text-xs text-slate-400">Upload/save your business logo from Admin Control Panel.</span>}</div></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="text-xs font-extrabold text-slate-900">PRINT TEMPLATE</div>
          <div className="text-[11px] text-slate-600 mt-1">Your SIAM AIR logo is fixed in the printed ticket. Airline logos are not used in the ticket header.</div>
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
