export type DacFlightRecord = {
  flightNo: string;
  airline: string;
  airlineCode: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  departureTime?: string;
  arrivalTime?: string;
  terminal?: string;
};

export const DAC_FLIGHT_DIRECTORY: DacFlightRecord[] = [
  {flightNo:'SV805',airline:'Saudia',airlineCode:'SV',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'00:45'},
  {flightNo:'EK585',airline:'Emirates',airlineCode:'EK',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'01:40'},
  {flightNo:'BG339',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'02:05'},
  {flightNo:'QR639',airline:'Qatar Airways',airlineCode:'QR',from:'DAC',fromName:'Dhaka',to:'DOH',toName:'Doha',departureTime:'02:15'},
  {flightNo:'OV498',airline:'SalamAir',airlineCode:'OV',from:'DAC',fromName:'Dhaka',to:'MCT',toName:'Muscat',departureTime:'02:30'},
  {flightNo:'SV803',airline:'Saudia',airlineCode:'SV',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'02:35'},
  {flightNo:'J9532',airline:'Jazeera Airways',airlineCode:'J9',from:'DAC',fromName:'Dhaka',to:'KWI',toName:'Kuwait',departureTime:'07:45'},
  {flightNo:'FZ502',airline:'flydubai',airlineCode:'FZ',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'08:10'},
  {flightNo:'BS309',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'SIN',toName:'Singapore',departureTime:'08:15'},
  {flightNo:'G9513',airline:'Air Arabia',airlineCode:'G9',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'08:55'},
  {flightNo:'RX764',airline:'Riyadh Air',airlineCode:'RX',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'08:20'},
  {flightNo:'GF251',airline:'Gulf Air',airlineCode:'GF',from:'DAC',fromName:'Dhaka',to:'BAH',toName:'Bahrain',departureTime:'09:55'},
  {flightNo:'KU286',airline:'Kuwait Airways',airlineCode:'KU',from:'DAC',fromName:'Dhaka',to:'KWI',toName:'Kuwait',departureTime:'10:15'},
  {flightNo:'EK583',airline:'Emirates',airlineCode:'EK',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'10:15'},
  {flightNo:'QR641',airline:'Qatar Airways',airlineCode:'QR',from:'DAC',fromName:'Dhaka',to:'DOH',toName:'Doha',departureTime:'11:10'},
  {flightNo:'BG388',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'BKK',toName:'Bangkok',departureTime:'11:15'},
  {flightNo:'AI2184',airline:'Air India',airlineCode:'AI',from:'DAC',fromName:'Dhaka',to:'BOM',toName:'Mumbai',departureTime:'11:45'},
  {flightNo:'MH103',airline:'Malaysia Airlines',airlineCode:'MH',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'12:15'},
  {flightNo:'UL190',airline:'SriLankan Airlines',airlineCode:'UL',from:'DAC',fromName:'Dhaka',to:'CMB',toName:'Colombo',departureTime:'12:55'},
  {flightNo:'CZ5016',airline:'China Southern Airlines',airlineCode:'CZ',from:'DAC',fromName:'Dhaka',to:'CAN',toName:'Guangzhou',departureTime:'13:15'},
  {flightNo:'BG349',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'DMM',toName:'Dammam',departureTime:'15:10'},
  {flightNo:'SV799',airline:'Saudia',airlineCode:'SV',from:'DAC',fromName:'Dhaka',to:'MED',toName:'Madinah',departureTime:'15:40'},
  {flightNo:'WY318',airline:'Oman Air',airlineCode:'WY',from:'DAC',fromName:'Dhaka',to:'MCT',toName:'Muscat',departureTime:'16:00'},
  {flightNo:'BS349',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'AUH',toName:'Abu Dhabi',departureTime:'16:25'},
  {flightNo:'G9515',airline:'Air Arabia',airlineCode:'G9',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'16:45'},
  {flightNo:'BS361',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'17:15'},
  {flightNo:'BG235',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'17:15'},
  {flightNo:'XY674',airline:'flynas',airlineCode:'XY',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'17:30'},
  {flightNo:'BG337',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'MED',toName:'Madinah',departureTime:'18:00'},
  {flightNo:'BG325',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'DOH',toName:'Doha',departureTime:'18:00'},
  {flightNo:'BG347',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'19:00'},
  {flightNo:'EK587',airline:'Emirates',airlineCode:'EK',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'19:30'},
  {flightNo:'G9572',airline:'Air Arabia',airlineCode:'G9',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'20:45'},
  {flightNo:'3L064',airline:'Air Arabia Abu Dhabi',airlineCode:'3L',from:'DAC',fromName:'Dhaka',to:'AUH',toName:'Abu Dhabi',departureTime:'21:05'},
  {flightNo:'BS345',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'21:40'},
  {flightNo:'FZ524',airline:'flydubai',airlineCode:'FZ',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'22:00'},
  {flightNo:'BS321',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'MCT',toName:'Muscat',departureTime:'22:30'},
  {flightNo:'G9511',airline:'Air Arabia',airlineCode:'G9',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'22:40'},
  {flightNo:'BS341',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'23:05'},
  {flightNo:'BG539',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'23:40'},
  {flightNo:'SQ447',airline:'Singapore Airlines',airlineCode:'SQ',from:'DAC',fromName:'Dhaka',to:'SIN',toName:'Singapore',departureTime:'23:55'},
  {flightNo:'TK743',airline:'Turkish Airlines',airlineCode:'TK',from:'DAC',fromName:'Dhaka',to:'IST',toName:'Istanbul',departureTime:'08:10'},
  {flightNo:'BS307',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'SIN',toName:'Singapore',departureTime:'22:30'},
  {flightNo:'BS381',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'14:50'},
  {flightNo:'BG135',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'17:15'},
  {flightNo:'BG376',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'NRT',toName:'Tokyo',departureTime:'02:25'},
  {flightNo:'BG366',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'CAN',toName:'Guangzhou',departureTime:'21:45'},
  {flightNo:'CZ392',airline:'China Southern Airlines',airlineCode:'CZ',from:'DAC',fromName:'Dhaka',to:'CAN',toName:'Guangzhou',departureTime:'23:25'},
  {flightNo:'AK70',airline:'AirAsia',airlineCode:'AK',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'23:10'}

  // Bangladesh domestic / regional carriers (approximate reusable schedule seed)
  {flightNo:'BG101',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'CGP',toName:'Chattogram',departureTime:'07:00'},
  {flightNo:'BG121',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'CXB',toName:"Cox's Bazar",departureTime:'08:00'},
  {flightNo:'BG135',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'17:15'},
  {flightNo:'BG611',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'CGP',toName:'Chattogram',departureTime:'16:00'},
  {flightNo:'BS101',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'CGP',toName:'Chattogram',departureTime:'07:30'},
  {flightNo:'BS141',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'CXB',toName:"Cox's Bazar",departureTime:'09:00'},
  {flightNo:'BS143',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'ZYL',toName:'Sylhet',departureTime:'10:00'},
  {flightNo:'2A101',airline:'Air Astra',airlineCode:'2A',from:'DAC',fromName:'Dhaka',to:'CGP',toName:'Chattogram',departureTime:'08:00'},
  {flightNo:'2A111',airline:'Air Astra',airlineCode:'2A',from:'DAC',fromName:'Dhaka',to:'CXB',toName:"Cox's Bazar",departureTime:'09:30'},
  {flightNo:'VQ901',airline:'NOVOAIR',airlineCode:'VQ',from:'DAC',fromName:'Dhaka',to:'CGP',toName:'Chattogram',departureTime:'07:45'},
  {flightNo:'VQ921',airline:'NOVOAIR',airlineCode:'VQ',from:'DAC',fromName:'Dhaka',to:'CXB',toName:"Cox's Bazar",departureTime:'10:15'},
  {flightNo:'VQ963',airline:'NOVOAIR',airlineCode:'VQ',from:'DAC',fromName:'Dhaka',to:'ZYL',toName:'Sylhet',departureTime:'11:30'},

  // Common Bangladesh-origin international sectors used for connections
  {flightNo:'BG121',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'01:00'},
  {flightNo:'BG147',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'23:00'},
  {flightNo:'BG305',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'BKK',toName:'Bangkok',departureTime:'22:00'},
  {flightNo:'BG395',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'CCU',toName:'Kolkata',departureTime:'17:15'},
  {flightNo:'BS201',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'CCU',toName:'Kolkata',departureTime:'10:00'},
  {flightNo:'BS337',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'MLE',toName:'Male',departureTime:'09:25'},
  {flightNo:'BS343',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'08:35'},
  {flightNo:'BS333',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'DOH',toName:'Doha',departureTime:'20:10'},
  {flightNo:'BS325',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'CAN',toName:'Guangzhou',departureTime:'22:00'},

  // Additional carriers / connection hubs observed in Bangladesh schedules
  {flightNo:'TG340',airline:'Thai Airways International',airlineCode:'TG',from:'DAC',fromName:'Dhaka',to:'BKK',toName:'Bangkok',departureTime:'02:30'},
  {flightNo:'TG322',airline:'Thai Airways International',airlineCode:'TG',from:'DAC',fromName:'Dhaka',to:'BKK',toName:'Bangkok',departureTime:'13:35'},
  {flightNo:'OD161',airline:'Batik Air',airlineCode:'OD',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'01:10'},
  {flightNo:'OD165',airline:'Batik Air',airlineCode:'OD',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'22:50'},
  {flightNo:'3L064',airline:'Air Arabia Abu Dhabi',airlineCode:'3L',from:'DAC',fromName:'Dhaka',to:'AUH',toName:'Abu Dhabi',departureTime:'21:05'},
  {flightNo:'6E1104',airline:'IndiGo',airlineCode:'6E',from:'DAC',fromName:'Dhaka',to:'DEL',toName:'Delhi',departureTime:'16:30'},
  {flightNo:'6E1106',airline:'IndiGo',airlineCode:'6E',from:'DAC',fromName:'Dhaka',to:'CCU',toName:'Kolkata',departureTime:'17:35'},
  {flightNo:'6E1114',airline:'IndiGo',airlineCode:'6E',from:'DAC',fromName:'Dhaka',to:'MAA',toName:'Chennai',departureTime:'14:55'},
  {flightNo:'6E1118',airline:'IndiGo',airlineCode:'6E',from:'DAC',fromName:'Dhaka',to:'HYD',toName:'Hyderabad',departureTime:'13:05'},
  {flightNo:'AI238',airline:'Air India',airlineCode:'AI',from:'DAC',fromName:'Dhaka',to:'DEL',toName:'Delhi',departureTime:'15:10'},
  {flightNo:'AI2184',airline:'Air India',airlineCode:'AI',from:'DAC',fromName:'Dhaka',to:'BOM',toName:'Mumbai',departureTime:'11:45'},
  {flightNo:'8D912D',airline:'FitsAir',airlineCode:'8D',from:'DAC',fromName:'Dhaka',to:'CMB',toName:'Colombo',departureTime:'12:35'},
  {flightNo:'KB301',airline:'Drukair',airlineCode:'KB',from:'DAC',fromName:'Dhaka',to:'PBH',toName:'Paro',departureTime:'13:40'},
  {flightNo:'ET681',airline:'Ethiopian Airlines',airlineCode:'ET',from:'DAC',fromName:'Dhaka',to:'ADD',toName:'Addis Ababa',departureTime:'14:20'},
  {flightNo:'MU2036',airline:'China Eastern Airlines',airlineCode:'MU',from:'DAC',fromName:'Dhaka',to:'KMG',toName:'Kunming',departureTime:'14:00'},
  {flightNo:'CZ8010',airline:'China Southern Airlines',airlineCode:'CZ',from:'DAC',fromName:'Dhaka',to:'PKX',toName:'Beijing Daxing',departureTime:'21:45'},
  {flightNo:'CZ5016',airline:'China Southern Airlines',airlineCode:'CZ',from:'DAC',fromName:'Dhaka',to:'CAN',toName:'Guangzhou',departureTime:'13:15'},
  {flightNo:'CX662',airline:'Cathay Pacific',airlineCode:'CX',from:'DAC',fromName:'Dhaka',to:'HKG',toName:'Hong Kong',departureTime:'23:00'},

  // Main connection hubs: reverse lookup is supported by the flight-assist API.
  {flightNo:'SV805',airline:'Saudia',airlineCode:'SV',from:'DAC',fromName:'Dhaka',to:'RUH',toName:'Riyadh',departureTime:'00:45'},
  {flightNo:'SV809',airline:'Saudia',airlineCode:'SV',from:'DAC',fromName:'Dhaka',to:'JED',toName:'Jeddah',departureTime:'13:20'},
  {flightNo:'BG201',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'LHR',toName:'London',departureTime:'07:40'},
  {flightNo:'BG247',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'16:55'},
  {flightNo:'BG151',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'SHJ',toName:'Sharjah',departureTime:'19:15'},
  {flightNo:'BG386',airline:'Biman Bangladesh Airlines',airlineCode:'BG',from:'DAC',fromName:'Dhaka',to:'KUL',toName:'Kuala Lumpur',departureTime:'21:10'},
  {flightNo:'BS201',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'CCU',toName:'Kolkata',departureTime:'10:00'},
  {flightNo:'BS343',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'DXB',toName:'Dubai',departureTime:'08:35'},
  {flightNo:'BS337',airline:'US-Bangla Airlines',airlineCode:'BS',from:'DAC',fromName:'Dhaka',to:'MLE',toName:'Male',departureTime:'09:25'},
];
