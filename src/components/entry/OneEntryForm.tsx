import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Plane,
  User,
  Users,
  Building,
  CreditCard,
  PlusCircle,
  CheckCircle2,
  Printer,
  MessageSquare,
  AlertCircle,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, FlightDetails, PaymentMethod, TicketStatus, Transaction, Vendor } from '../../types';
import { formatCurrency, formatDate, formatTime, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { USE_SERVER_API } from '../../services/apiClient';

interface OneEntryFormProps {
  onClose?: () => void;
  onViewInvoice: (tx: Transaction) => void;
}

export const OneEntryForm: React.FC<OneEntryFormProps> = ({ onClose, onViewInvoice }) => {
  const { customers, vendors, services, createOneEntry, createOneEntryAsync, settings } = useApp();

  // Customer state
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPassport, setCustomerPassport] = useState('');
  const [customerPassportExpiry, setCustomerPassportExpiry] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Service state
  const [serviceId, setServiceId] = useState(services[0]?.id || 'srv_1');
  const selectedService = services.find((s) => s.id === serviceId);
  const isFlightService =
    selectedService?.category === 'Air Ticket' ||
    selectedService?.name.toLowerCase().includes('ticket') ||
    selectedService?.name.toLowerCase().includes('flight');

  // Flight specific state
  const [pnr, setPnr] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [airline, setAirline] = useState('Saudi Arabian Airlines');
  const [flightNumber, setFlightNumber] = useState('');
  const [route, setRoute] = useState('DAC → ');
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [departureTime, setDepartureTime] = useState('10:00');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [flightClass, setFlightClass] = useState('Economy (V)');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('Confirmed');
  const [flightNotes, setFlightNotes] = useState('');

  // Customer Financials
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [customerPaid, setCustomerPaid] = useState<number | ''>('');
  const [customerPaymentMethod, setCustomerPaymentMethod] = useState<PaymentMethod>('Cash');

  // Vendor Details
  const [hasVendor, setHasVendor] = useState(true);
  const [vendorQuery, setVendorQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorCompany, setVendorCompany] = useState('');
  const [vendorCost, setVendorCost] = useState<number | ''>('');
  const [vendorPaid, setVendorPaid] = useState<number | ''>('');
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<PaymentMethod>('Bank');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  // Reminder state
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reminderTime, setReminderTime] = useState('11:00');
  const [reminderNote, setReminderNote] = useState('');

  // General notes & description
  const [description, setDescription] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Post submit state
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Autocomplete matching for customers (min 1 letter)
  const filteredCustomers = customerQuery.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
          c.mobile.includes(customerQuery) ||
          (c.passportNumber && c.passportNumber.toLowerCase().includes(customerQuery.toLowerCase()))
      )
    : [];

  // Autocomplete matching for vendors (min 1 letter)
  const filteredVendors = vendorQuery.trim()
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(vendorQuery.toLowerCase()) ||
          (v.company && v.company.toLowerCase().includes(vendorQuery.toLowerCase())) ||
          v.mobile.includes(vendorQuery)
      )
    : [];

  // Calculated figures
  const numSellingPrice = Number(sellingPrice) || 0;
  const numCustomerPaid = Number(customerPaid) || 0;
  const calculatedCustomerDue = Math.max(0, numSellingPrice - numCustomerPaid);

  const numVendorCost = hasVendor ? Number(vendorCost) || 0 : 0;
  const numVendorPaid = hasVendor ? Number(vendorPaid) || 0 : 0;
  const calculatedVendorDue = hasVendor ? Math.max(0, numVendorCost - numVendorPaid) : 0;

  const grossProfit = numSellingPrice - numVendorCost;

  // Auto-sync passenger name with customer name if empty
  useEffect(() => {
    if (!passengerName && customerQuery) {
      setPassengerName(customerQuery);
    }
  }, [customerQuery, passengerName]);

  // When customer due is created, auto-enable reminder by default
  useEffect(() => {
    if (calculatedCustomerDue > 0 && !setReminder) {
      setSetReminder(true);
    }
  }, [calculatedCustomerDue]);

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerQuery(cust.name);
    setCustomerMobile(cust.mobile);
    setCustomerEmail(cust.email || '');
    setCustomerAddress(cust.address || '');
    setCustomerPassport(cust.passportNumber || '');
    setCustomerPassportExpiry(cust.passportExpiry || '');
    setPassengerName(cust.name);
    setCustomerDropdownOpen(false);
  };

  const handleSelectVendor = (vend: Vendor) => {
    setSelectedVendor(vend);
    setVendorQuery(vend.name);
    setVendorMobile(vend.mobile);
    setVendorCompany(vend.company || '');
    setVendorDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!customerQuery.trim()) { alert('Please enter or select a customer name.'); return; }
    if (!customerMobile.trim()) { alert('Please enter customer mobile number.'); return; }
    if (numSellingPrice <= 0) { alert('Please enter a valid selling price.'); return; }

    let flightDetails: FlightDetails | undefined = undefined;
    if (isFlightService) {
      flightDetails = {
        pnr: pnr.trim().toUpperCase(), ticketNumber: ticketNumber.trim(),
        passengerName: passengerName.trim() || customerQuery.trim(), airline: airline.trim(),
        flightNumber: flightNumber.trim().toUpperCase(), route: route.trim().toUpperCase(),
        departureDate, departureTime, arrivalDate: arrivalDate || undefined,
        arrivalTime: arrivalTime || undefined, flightClass, ticketStatus, notes: flightNotes,
      };
    }

    setIsSubmitting(true);
    try {
      const input: Parameters<typeof createOneEntry>[0] = {
        customerMode: selectedCustomer ? 'existing' : 'new', customerId: selectedCustomer?.id,
        customerName: customerQuery, customerMobile, customerEmail, customerAddress,
        customerPassportNumber: customerPassport, customerPassportExpiry: customerPassportExpiry,
        serviceId, serviceName: selectedService?.name || 'General Service',
        description: description || (isFlightService ? airline + ' ' + route : selectedService?.name),
        isFlight: Boolean(isFlightService), flightDetails, sellingPrice: numSellingPrice,
        customerPaid: numCustomerPaid, customerPaymentMethod, hasVendor,
        vendorMode: selectedVendor ? 'existing' : 'new', vendorId: selectedVendor?.id,
        vendorName: vendorQuery.trim(), vendorMobile, vendorCompany, vendorCost: numVendorCost,
        vendorPaid: numVendorPaid, vendorPaymentMethod,
        reminderDate: setReminder ? reminderDate : undefined, reminderTime: setReminder ? reminderTime : undefined,
        reminderNote: reminderNote || ('Collect remaining balance ' + formatCurrency(calculatedCustomerDue)),
        notes: generalNotes,
      };
      const tx = USE_SERVER_API ? await createOneEntryAsync(input) : createOneEntry(input);
      setCreatedTx(tx);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Entry could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCreatedTx(null);
    setCustomerQuery('');
    setSelectedCustomer(null);
    setCustomerMobile('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerPassport('');
    setCustomerPassportExpiry('');
    setPnr('');
    setTicketNumber('');
    setPassengerName('');
    setFlightNumber('');
    setAirline('Saudi Arabian Airlines');
    setRoute('DAC → ');
    setDepartureDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setDepartureTime('10:00');
    setArrivalDate('');
    setArrivalTime('');
    setFlightClass('Economy (V)');
    setTicketStatus('Confirmed');
    setFlightNotes('');
    setSellingPrice('');
    setCustomerPaid('');
    setCustomerPaymentMethod('Cash');
    setHasVendor(true);
    setVendorCost('');
    setVendorPaid('');
    setVendorQuery('');
    setSelectedVendor(null);
    setVendorMobile('');
    setVendorCompany('');
    setVendorPaymentMethod('Bank');
    setSetReminder(false);
    setReminderDate(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setReminderTime('11:00');
    setReminderNote('');
    setDescription('');
    setGeneralNotes('');
    setServiceId(services[0]?.id || 'srv_1');
  };

  // SUCCESS STATE MODAL / BANNER
  if (createdTx) {
    const whatsappMsg = encodeURIComponent(
      `INVOICE & BOOKING CONFIRMATION - ${settings.name}\n\nDear ${createdTx.customerName},\nYour entry has been booked successfully!\nInvoice: ${createdTx.invoiceNumber}\nService: ${createdTx.serviceName}\n${createdTx.flightDetails ? `Route: ${createdTx.flightDetails.route}\nFlight: ${createdTx.flightDetails.flightNumber} (${createdTx.flightDetails.airline})\nPNR: ${createdTx.flightDetails.pnr}\nDeparture: ${formatDate(createdTx.flightDetails.departureDate)} at ${formatTime(createdTx.flightDetails.departureTime)}\n` : ''}Total Amount: ${formatCurrency(createdTx.sellingPrice)}\nAmount Paid: ${formatCurrency(createdTx.customerPaid)} (${createdTx.customerPaymentMethod})\nRemaining Due: ${formatCurrency(createdTx.customerDue)}\nPayment Status: ${createdTx.status}\n\nThank you for choosing ${settings.name}!\nHelpline: ${settings.mobile}`
    );

    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-md text-center">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Entry Successfully Booked & Synced!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Everything has been automatically updated in Customer Ledger, Vendor Ledger,
          Account Balances, Flight Calendar, Reminders & Audit History.
        </p>

        {/* Invoice Summary Box */}
        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs font-mono space-y-2">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-bold text-slate-900">{createdTx.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-bold text-slate-900">{createdTx.customerName} ({createdTx.customerMobile})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Service:</span>
            <span className="font-bold text-slate-900">{createdTx.serviceName}</span>
          </div>
          {createdTx.flightDetails && (
            <div className="flex justify-between text-blue-600">
              <span>Flight Details:</span>
              <span>{createdTx.flightDetails.route} · PNR: {createdTx.flightDetails.pnr}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">Total Sale:</span>
            <span className="font-bold text-slate-900">{formatCurrency(createdTx.sellingPrice)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Customer Paid:</span>
            <span className="font-bold">{formatCurrency(createdTx.customerPaid)} ({createdTx.customerPaymentMethod})</span>
          </div>
          <div className="flex justify-between text-rose-600 font-bold">
            <span>Remaining Due:</span>
            <span>{formatCurrency(createdTx.customerDue)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-700">
            <span>Gross Profit:</span>
            <span className="font-bold text-emerald-700">{formatCurrency(createdTx.grossProfit)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onViewInvoice(createdTx)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print / View Invoice</span>
          </button>

          {createdTx.customerMobile && (
            <a
              href={`https://wa.me/${sanitizePhoneForWhatsapp(createdTx.customerMobile)}?text=${whatsappMsg}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send WhatsApp Receipt</span>
            </a>
          )}

          <button
            onClick={handleResetForm}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Entry</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 font-bold tracking-wider">
              Central Engine
            </span>
            <span className="text-xs text-slate-400">One Entry → Everything Updated</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
            New Business & Service Entry
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (customerQuery || sellingPrice || pnr || vendorQuery) {
                if (confirm('Clear all input fields in this form?')) {
                  handleResetForm();
                }
              } else {
                handleResetForm();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
            title="Clear all input fields"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Inputs</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {submitError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
            <div className="font-bold">Entry was not saved</div>
            <div className="mt-1">{submitError}</div>
          </div>
        )}
        {/* 1. CUSTOMER SECTION WITH AUTOCOMPLETE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Customer Information</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Type 1-2 letters to search or type new customer
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Customer Search / Name */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerQuery}
                placeholder="e.g. Rahim Uddin"
                onFocus={() => setCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setSelectedCustomer(null);
                  setCustomerDropdownOpen(true);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              {/* Autocomplete Dropdown */}
              {customerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/70 transition-colors text-xs flex flex-col"
                    >
                      <span className="font-bold text-slate-900">{cust.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {cust.mobile} {cust.passportNumber ? `· Passport: ${cust.passportNumber}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerMobile}
                placeholder="01812-345678"
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Passport Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Passport Number (Optional)
              </label>
              <input
                type="text"
                value={customerPassport}
                placeholder="e.g. A03891244"
                onChange={(e) => setCustomerPassport(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
              />
            </div>

            {/* Passport Expiry */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Passport Expiry
              </label>
              <input
                type="date"
                value={customerPassportExpiry}
                onChange={(e) => setCustomerPassportExpiry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Address / City
              </label>
              <input
                type="text"
                value={customerAddress}
                placeholder="e.g. Maijdee, Noakhali"
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                placeholder="customer@email.com"
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. SERVICE SELECTOR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>2. Service Selection</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Service <span className="text-rose-500">*</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {services
                  .filter((s) => s.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Service Description / Notes
              </label>
              <input
                type="text"
                value={description}
                placeholder="e.g. Urgent Express Processing, 2PC 23kg luggage included"
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. AIR TICKET SPECIFIC FIELDS (If Air Ticket service is chosen) */}
        {isFlightService && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                <Plane className="w-4 h-4 text-blue-700" />
                <span>Air Ticket Flight Details</span>
              </div>
              <span className="text-[11px] text-blue-700 font-semibold font-mono">
                Automatically posts to Flight Calendar (Next 30D)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* PNR */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  PNR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={isFlightService}
                  value={pnr}
                  placeholder="e.g. SV792A"
                  onChange={(e) => setPnr(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Ticket Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ticket Number
                </label>
                <input
                  type="text"
                  value={ticketNumber}
                  placeholder="e.g. 065-2490182390"
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Passenger Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Passenger Name
                </label>
                <input
                  type="text"
                  value={passengerName}
                  placeholder="Passenger Name on Ticket"
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Airline */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Airline
                </label>
                <input
                  type="text"
                  value={airline}
                  placeholder="e.g. Saudia, Biman, Emirates"
                  onChange={(e) => setAirline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Flight Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Flight Number
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  placeholder="e.g. SV-805"
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Route */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sector / Route
                </label>
                <input
                  type="text"
                  value={route}
                  placeholder="e.g. DAC → DMM"
                  onChange={(e) => setRoute(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Departure Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required={isFlightService}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Departure Time */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Departure Time
                </label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Ticket Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ticket Status
                </label>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value as TicketStatus)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Schedule Changed">Schedule Changed</option>
                  <option value="Reissued">Reissued</option>
                  <option value="Refund">Refund</option>
                  <option value="Void">Void</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Flight Class */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Class
                </label>
                <input
                  type="text"
                  value={flightClass}
                  placeholder="e.g. Economy (V)"
                  onChange={(e) => setFlightClass(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. FINANCIALS (SALE, CUSTOMER PAYMENT, VENDOR COST) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Customer Sale & Payment */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 uppercase">
                Customer Sale & Payment
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Formula: Due = Sale - Paid
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Total Sale / Selling Price (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={sellingPrice}
                  placeholder="0"
                  onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Paid (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customerPaid}
                    placeholder="0"
                    onChange={(e) => setCustomerPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-600 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={customerPaymentMethod}
                    onChange={(e) => setCustomerPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Cash">Cash (Counter)</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank">Bank Deposit/Cheque</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Due Indicator */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-600 font-semibold">Customer Due:</span>
                <span className={`font-bold text-sm tabular-nums ${calculatedCustomerDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(calculatedCustomerDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Vendor / Supplier Cost & Payment */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900 uppercase">
                <input
                  type="checkbox"
                  checked={hasVendor}
                  onChange={(e) => setHasVendor(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Vendor / Consolidator Cost</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                Formula: Due = Cost - Paid
              </span>
            </div>

            {hasVendor ? (
              <div className="space-y-3">
                {/* Vendor Autocomplete Search */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vendor / Agency Name
                  </label>
                  <input
                    type="text"
                    value={vendorQuery}
                    placeholder="e.g. Dynamic Travels Ltd"
                    onFocus={() => setVendorDropdownOpen(true)}
                    onChange={(e) => {
                      setVendorQuery(e.target.value);
                      setSelectedVendor(null);
                      setVendorDropdownOpen(true);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  {vendorDropdownOpen && filteredVendors.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredVendors.map((vend) => (
                        <button
                          key={vend.id}
                          type="button"
                          onClick={() => handleSelectVendor(vend)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50/70 transition-colors text-xs flex flex-col"
                        >
                          <span className="font-bold text-slate-900">{vend.name}</span>
                          <span className="text-[11px] text-slate-500">{vend.company || vend.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vendor Cost (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={vendorCost}
                      placeholder="0"
                      onChange={(e) => setVendorCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-semibold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vendor Paid (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={vendorPaid}
                      placeholder="0"
                      onChange={(e) => setVendorPaid(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-semibold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-600 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Vendor Payment Method
                  </label>
                  <select
                    value={vendorPaymentMethod}
                    onChange={(e) => setVendorPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Bank">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Cash">Cash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Dynamic Vendor Due */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-600 font-semibold">Vendor Payable / Due:</span>
                  <span className={`font-bold text-sm tabular-nums ${calculatedVendorDue > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                    {formatCurrency(calculatedVendorDue)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Direct in-house digital service (No third party vendor cost)
              </div>
            )}
          </div>
        </div>

        {/* 5. PROFIT PREVIEW BAR */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Live Profit / Loss Projection
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-400">
              {formatCurrency(grossProfit)}
            </div>
            <div className="text-[11px] text-slate-400">
              {grossProfit >= 0 ? 'Net positive gross margin' : 'Deficit / Loss warning'} (Selling Price {formatCurrency(numSellingPrice)} - Cost {formatCurrency(numVendorCost)})
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-mono space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-700 pt-2 sm:pt-0 sm:pl-4">
            <div>Customer Due: <span className="font-bold text-rose-400">{formatCurrency(calculatedCustomerDue)}</span></div>
            <div>Vendor Due: <span className="font-bold text-amber-300">{formatCurrency(calculatedVendorDue)}</span></div>
          </div>
        </div>

        {/* 6. PAYMENT REMINDER SCHEDULE */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900 uppercase">
              <input
                type="checkbox"
                checked={setReminder}
                onChange={(e) => setSetReminder(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Schedule Payment Reminder</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Alerts appear on Dashboard & WhatsApp trigger
            </span>
          </div>

          {setReminder && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reminder Date
                </label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reminder Time
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reminder Note / Instructions
                </label>
                <input
                  type="text"
                  value={reminderNote}
                  placeholder="e.g. Call before 12 PM for full balance"
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (customerQuery || sellingPrice || pnr || vendorQuery) {
                if (confirm('Clear all input fields in this form?')) {
                  handleResetForm();
                }
              } else {
                handleResetForm();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Form</span>
          </button>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create & Synchronize All Ledgers</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
