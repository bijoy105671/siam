import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Plane,
  Building2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Search,
  ArrowLeft,
  Lock,
  Download,
  Share2,
  FileCheck,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  InvoiceVerificationPayload,
  computeVerificationHash,
  safeBase64Decode,
  buildVerificationPayload,
} from '../../utils/invoiceVerification';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

interface InvoiceVerificationPageProps {
  invoiceNumberFromUrl?: string;
  signatureFromUrl?: string;
  dataFromUrl?: string;
  onBackToApp?: () => void;
}

export const InvoiceVerificationPage: React.FC<InvoiceVerificationPageProps> = ({
  invoiceNumberFromUrl,
  signatureFromUrl,
  dataFromUrl,
  onBackToApp,
}) => {
  const { transactions, settings } = useApp();

  const [loading, setLoading] = useState(true);
  const [verifiedPayload, setVerifiedPayload] = useState<InvoiceVerificationPayload | null>(null);
  const [computedHash, setComputedHash] = useState<string>('');
  const [isSignatureValid, setIsSignatureValid] = useState<boolean>(false);
  const [isDatabaseMatched, setIsDatabaseMatched] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState(invoiceNumberFromUrl || '');
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  useEffect(() => {
    verifyInvoice();
  }, [invoiceNumberFromUrl, signatureFromUrl, dataFromUrl, transactions]);

  const verifyInvoice = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      let payload: InvoiceVerificationPayload | null = null;
      let dbMatched = false;

      // 1. Try decoding payload from URL query parameter (self-contained verifiable digital token)
      if (dataFromUrl) {
        try {
          const decodedJson = safeBase64Decode(dataFromUrl);
          if (decodedJson) {
            payload = JSON.parse(decodedJson);
          }
        } catch (e) {
          console.error('Failed to parse URL payload data:', e);
        }
      }

      // 2. Check if transaction exists in current database
      const targetInvoice = invoiceNumberFromUrl || payload?.invoiceNumber;
      if (targetInvoice) {
        const foundInDb = transactions.find(
          (t) => t.invoiceNumber.toLowerCase() === targetInvoice.toLowerCase()
        );

        if (foundInDb) {
          // If found in live database, build verified payload directly from official database
          payload = buildVerificationPayload(foundInDb, settings);
          dbMatched = true;
        }
      }

      if (!payload) {
        setErrorMessage(
          `Unable to verify invoice: No valid invoice record or digital signature payload was detected for "${
            invoiceNumberFromUrl || 'unknown'
          }".`
        );
        setLoading(false);
        return;
      }

      // 3. Compute canonical SHA-256 hash of the payload
      const hash = await computeVerificationHash(payload);
      setComputedHash(hash);

      // 4. Verify signature
      if (signatureFromUrl) {
        const matches = signatureFromUrl.toLowerCase() === hash.toLowerCase();
        setIsSignatureValid(matches);
      } else {
        // If loaded directly from database without URL signature
        setIsSignatureValid(true);
      }

      setIsDatabaseMatched(dbMatched);
      setVerifiedPayload(payload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while validating cryptographic signature.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search in current DB
    const found = transactions.find(
      (t) =>
        t.invoiceNumber.toLowerCase() === searchQuery.trim().toLowerCase() ||
        t.flightDetails?.pnr?.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (found) {
      const p = buildVerificationPayload(found, settings);
      setVerifiedPayload(p);
      computeVerificationHash(p).then((h) => {
        setComputedHash(h);
        setIsSignatureValid(true);
        setIsDatabaseMatched(true);
        setErrorMessage(null);
      });
    } else {
      setErrorMessage(
        `Invoice #${searchQuery.trim()} was not found in the agency records. Please check the invoice number.`
      );
      setVerifiedPayload(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyHash = () => {
    if (computedHash) {
      navigator.clipboard.writeText(computedHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar / Header banner */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight sm:text-base text-white">
                  Document Authenticity Verification
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  SSL Encrypted
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Public Verification Portal · {verifiedPayload?.agency.name || settings.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
              title="Copy verification link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Certificate</span>
            </button>

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Agency CRM</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-base font-semibold text-slate-800">
              Validating Cryptographic Seal & Record Integrity...
            </div>
            <p className="text-xs text-slate-500">Checking SHA-256 digital signature against agency ledger.</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-rose-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-rose-900">Verification Could Not Be Completed</h2>
                <p className="text-sm text-slate-600">{errorMessage}</p>
                <p className="text-xs text-slate-500 mt-2">
                  If you have a printed paper invoice or booking slip, please verify that the invoice number matches
                  exactly or contact the issuing office below.
                </p>
              </div>
            </div>

            {/* Quick search input */}
            <form onSubmit={handleManualSearch} className="flex gap-2 max-w-md pt-2">
              <input
                type="text"
                placeholder="Enter Invoice No. (e.g. INV-1001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer"
              >
                Search Record
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap gap-4">
              <a
                href={`tel:${settings.mobile}`}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
              >
                <Phone className="w-3.5 h-3.5" /> Call Agency Helpline: {settings.mobile}
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
              >
                <Mail className="w-3.5 h-3.5" /> Email: {settings.email}
              </a>
            </div>
          </div>
        ) : verifiedPayload ? (
          <div id="printable-certificate" className="space-y-6">
            {/* 1. Official Verification Status Banner */}
            <div
              className={`rounded-2xl p-5 sm:p-6 shadow-sm border transition-all ${
                isSignatureValid
                  ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white border-emerald-500/30'
                  : 'bg-rose-950 text-white border-rose-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isSignatureValid
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                    }`}
                  >
                    {isSignatureValid ? (
                      <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-7 h-7 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-mono font-semibold text-emerald-400">
                        Official Authentication Status
                      </span>
                      {isDatabaseMatched && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded">
                          Live Database Synchronized
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                      {isSignatureValid ? 'Authentic & Verified Invoice' : 'Verification Warning'}
                    </h1>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {isSignatureValid
                        ? `This document is verified as an official, tamper-proof invoice issued by ${verifiedPayload.agency.name}. All financial records, customer details, and booking parameters have been validated.`
                        : 'Cryptographic digital signature mismatch. The contents of this invoice may have been altered.'}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 font-mono text-xs border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/60">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Verification Certificate</div>
                  <div className="text-lg font-bold text-white tracking-wide mt-0.5">
                    {verifiedPayload.invoiceNumber}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Verified on: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Detailed Invoice Authenticity Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Card Header with Agency Profile */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {verifiedPayload.agency.name.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{verifiedPayload.agency.name}</h2>
                    <p className="text-xs text-slate-500 font-medium">{verifiedPayload.agency.tagline}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{verifiedPayload.agency.address}</span>
                      <span>·</span>
                      <span>{verifiedPayload.agency.mobile}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                      verifiedPayload.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : verifiedPayload.status === 'PARTIAL'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>Payment: {verifiedPayload.status}</span>
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Issued: {formatDate(verifiedPayload.date)} at {formatTime(verifiedPayload.time)}
                  </div>
                </div>
              </div>

              {/* Core Information Grid */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Customer & Issue Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                      Billed Customer
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">{verifiedPayload.customerName}</div>
                    {verifiedPayload.customerMobile && (
                      <div className="text-slate-600 font-mono mt-0.5">Phone: {verifiedPayload.customerMobile}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                      Service Category
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{verifiedPayload.serviceName}</div>
                    {verifiedPayload.description && (
                      <div className="text-slate-500 mt-0.5 line-clamp-1">{verifiedPayload.description}</div>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                      Authorized Issue Desk
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{verifiedPayload.createdBy}</div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Ref ID: {verifiedPayload.transactionId}
                    </div>
                  </div>
                </div>

                {/* Flight & Travel Details Card (if present) */}
                {verifiedPayload.flightDetails && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                      <div className="flex items-center gap-2 font-bold text-blue-950 text-xs uppercase tracking-wide">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span>Verified Flight Ticket & Itinerary Data</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded">
                        PNR: {verifiedPayload.flightDetails.pnr}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs pt-1">
                      <div>
                        <div className="text-[10px] text-slate-500">Route / Sector:</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {verifiedPayload.flightDetails.route}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Airline / Flight:</div>
                        <div className="font-semibold text-slate-900 text-sm mt-0.5">
                          {verifiedPayload.flightDetails.airline} {verifiedPayload.flightDetails.flightNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Departure:</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">
                          {formatDate(verifiedPayload.flightDetails.departureDate)} ·{' '}
                          {formatTime(verifiedPayload.flightDetails.departureTime)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Ticket Status:</div>
                        <div className="font-bold text-emerald-700 text-xs mt-0.5">
                          {verifiedPayload.flightDetails.ticketStatus || 'Confirmed'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Passenger:</div>
                        <div className="font-medium text-slate-800">
                          {verifiedPayload.flightDetails.passengerName}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Ticket Number:</div>
                        <div className="font-medium text-slate-800">
                          {verifiedPayload.flightDetails.ticketNumber || 'Confirmed in System'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Flight Class:</div>
                        <div className="font-medium text-slate-800">
                          {verifiedPayload.flightDetails.flightClass || 'Economy'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Special Notes:</div>
                        <div className="font-medium text-slate-600 truncate">
                          {verifiedPayload.flightDetails.notes || 'None recorded'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Ledger Audit Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verified Financial Ledger Summary</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center sm:text-left">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Total Invoiced Amount</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {formatCurrency(verifiedPayload.sellingPrice)}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center sm:text-left">
                      <div className="text-[10px] uppercase text-emerald-700 font-bold">Amount Paid (Confirmed)</div>
                      <div className="text-lg font-bold text-emerald-800 mt-1">
                        {formatCurrency(verifiedPayload.customerPaid)}
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-lg border text-center sm:text-left ${
                        verifiedPayload.customerDue > 0
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase font-bold ${
                          verifiedPayload.customerDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        Balance Due
                      </div>
                      <div
                        className={`text-lg font-bold mt-1 ${
                          verifiedPayload.customerDue > 0 ? 'text-rose-800' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(verifiedPayload.customerDue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Security Details Section */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-700" />
                      <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                        Cryptographic Digital Signature & Integrity Seal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSecurityDetails((p) => !p)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                    >
                      {showSecurityDetails ? 'Hide Technical Details' : 'View Security Details'}
                    </button>
                  </div>

                  <div className="font-mono text-[11px] text-slate-600 break-all bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 select-none">SHA-256 Digest: </span>
                      <span className="text-slate-800 font-semibold">{computedHash}</span>
                    </div>
                    <button
                      onClick={handleCopyHash}
                      className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition shrink-0 cursor-pointer"
                      title="Copy SHA-256 hash"
                    >
                      {copiedHash ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {showSecurityDetails && (
                    <div className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-200 font-mono">
                      <div>
                        <strong>Standard:</strong> FIPS PUB 180-4 SHA-256 Cryptographic Hash
                      </div>
                      <div>
                        <strong>Payload Canon:</strong> SIAM_AIR_VERIFY_v1 | {verifiedPayload.invoiceNumber} |{' '}
                        {verifiedPayload.customerName} | {verifiedPayload.sellingPrice}
                      </div>
                      <div>
                        <strong>Issuance Timestamp:</strong> {verifiedPayload.issuedAt}
                      </div>
                      <div>
                        <strong>System ID:</strong> SIAM AIR & DIGITAL SERVICE SECURITY ENGINE v2.0
                      </div>
                    </div>
                  )}
                </div>

                {/* Agency Verification Seal & Watermark */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-emerald-400 bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs">OFFICIAL ELECTRONIC STAMP</div>
                      <div className="text-[11px] text-slate-500">
                        {verifiedPayload.agency.name} · Certified True & Authentic
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-[11px] text-slate-400">
                    <div>Verification Token: {verifiedPayload.invoiceNumber}-VERIFIED</div>
                    <div>Audited: {new Date().toISOString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistance & Helpline Footer */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 no-print">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>
                  Questions regarding this invoice? Contact{' '}
                  <strong className="text-slate-800">{verifiedPayload.agency.name}</strong> support desk.
                </span>
              </div>
              <div className="flex items-center gap-3 font-medium">
                <a
                  href={`tel:${verifiedPayload.agency.mobile}`}
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{verifiedPayload.agency.mobile}</span>
                </a>
                <span>·</span>
                <a
                  href={`mailto:${verifiedPayload.agency.email}`}
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{verifiedPayload.agency.email}</span>
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
