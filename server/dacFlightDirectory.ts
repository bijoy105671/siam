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
];
