import QRCode from 'qrcode';
import { Transaction, BusinessSettings } from '../types';
import { calculateSha256Hex } from './cryptoBackup';

export interface InvoiceVerificationPayload {
  invoiceNumber: string;
  transactionId: string;
  date: string;
  time: string;
  customerName: string;
  customerMobile?: string;
  serviceName: string;
  description?: string;
  sellingPrice: number;
  customerPaid: number;
  customerDue: number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'REFUND' | 'CANCELLED';
  createdBy: string;
  flightDetails?: {
    pnr: string;
    ticketNumber?: string;
    passengerName: string;
    airline: string;
    flightNumber: string;
    route: string;
    departureDate: string;
    departureTime: string;
    flightClass?: string;
    ticketStatus: string;
    notes?: string;
  };
  agency: {
    name: string;
    tagline: string;
    mobile: string;
    email: string;
    address: string;
    website: string;
  };
  issuedAt: string;
}

// Unicode-safe Base64 encoder
export function safeBase64Encode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// Unicode-safe Base64 decoder
export function safeBase64Decode(base64: string): string {
  try {
    const binary = atob(base64);
    const percentEncoded = Array.prototype.map
      .call(binary, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch (e) {
    console.error('Failed to safeBase64Decode:', e);
    return '';
  }
}

/**
 * Builds the canonical verification payload from transaction and business settings.
 */
export function buildVerificationPayload(
  transaction: Transaction,
  settings: BusinessSettings
): InvoiceVerificationPayload {
  return {
    invoiceNumber: transaction.invoiceNumber,
    transactionId: transaction.id,
    date: transaction.date,
    time: transaction.time,
    customerName: transaction.customerName,
    customerMobile: transaction.customerMobile,
    serviceName: transaction.serviceName,
    description: transaction.description,
    sellingPrice: transaction.sellingPrice,
    customerPaid: transaction.customerPaid,
    customerDue: transaction.customerDue,
    status: transaction.status,
    createdBy: transaction.createdBy,
    flightDetails: transaction.flightDetails
      ? {
          pnr: transaction.flightDetails.pnr,
          ticketNumber: transaction.flightDetails.ticketNumber,
          passengerName: transaction.flightDetails.passengerName,
          airline: transaction.flightDetails.airline,
          flightNumber: transaction.flightDetails.flightNumber,
          route: transaction.flightDetails.route,
          departureDate: transaction.flightDetails.departureDate,
          departureTime: transaction.flightDetails.departureTime,
          flightClass: transaction.flightDetails.flightClass,
          ticketStatus: transaction.flightDetails.ticketStatus,
          notes: transaction.flightDetails.notes,
        }
      : undefined,
    agency: {
      name: settings.name,
      tagline: settings.tagline,
      mobile: settings.mobile,
      email: settings.email,
      address: settings.address,
      website: settings.website,
    },
    issuedAt: `${transaction.date}T${transaction.time}:00Z`,
  };
}

/**
 * Computes canonical SHA-256 digital signature/hash for verification.
 */
export async function computeVerificationHash(
  payload: InvoiceVerificationPayload
): Promise<string> {
  const canonicalString = [
    'SIAM_AIR_VERIFY_v1',
    payload.invoiceNumber,
    payload.transactionId,
    payload.customerName,
    payload.sellingPrice.toString(),
    payload.customerPaid.toString(),
    payload.status,
    payload.date,
    payload.time,
    payload.flightDetails?.pnr || '',
    payload.flightDetails?.ticketNumber || '',
    payload.agency.name,
  ].join('|#|');

  return await calculateSha256Hex(canonicalString);
}

/**
 * Generates the full public verification URL.
 */
export async function generateVerificationUrl(
  transaction: Transaction,
  settings: BusinessSettings
): Promise<{ url: string; hash: string; payload: InvoiceVerificationPayload }> {
  const payload = buildVerificationPayload(transaction, settings);
  const hash = await computeVerificationHash(payload);
  const payloadJson = JSON.stringify(payload);
  const encodedPayload = safeBase64Encode(payloadJson);

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // We provide verify parameter + sig + d (data)
  const url = `${origin}${pathname}?verify=${encodeURIComponent(
    payload.invoiceNumber
  )}&sig=${hash}&d=${encodeURIComponent(encodedPayload)}`;

  return { url, hash, payload };
}

/**
 * Generates a high-quality QR code image data URL for a given string or URL.
 */
export async function generateQRCodeDataUrl(
  text: string,
  width = 300
): Promise<string> {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width,
    color: {
      dark: '#0f172a', // Deep slate for sharp contrast & scannability
      light: '#ffffff',
    },
  });
}
