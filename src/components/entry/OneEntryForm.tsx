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

interface AdditionalServiceLine {
  id: string;
  serviceId: string;
  description: string;
  sellingPrice: number | '';
  customerPaid: number | '';
  customerPaymentMethod: PaymentMethod;
  hasVendor: boolean;
  vendorName: string;
  vendorCost: number | '';
  vendorPaid: number | '';
  vendorPaymentMethod: PaymentMethod;
  accountCost: number | '';
  accountCostPaymentMethod: PaymentMethod;
  pnr: string;
  ticketNumber: string;
  passengerName: string;
  airline: string;
  flightNumber: string;
  route: string;
  departureDate: string;
  departureTime: string;
}
export const OneEntryForm: React.FC<OneEntryFormProps> = ({ onClose, onViewInvoice }) => {
  const { customers, vendors, services, createOneEntry, createOneEntryAsync, settings, createAppointment } = useApp();

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
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceLine[]>([]);

  const createAdditionalServiceLine = (): AdditionalServiceLine => ({
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serviceId: services.find((s) => s.enabled)?.id || services[0]?.id || 'srv_1',
    description: '',
    sellingPrice: '',
    customerPaid: '',
    customerPaymentMethod: 'Cash',
    hasVendor: true,
    vendorName: '',
    vendorCost: '',
    vendorPaid: '',
    vendorPaymentMethod: 'Bank',
    accountCost: '',
    accountCostPaymentMethod: 'bKash',
    pnr: '',
    ticketNumber: '',
    passengerName: customerQuery,
    airline: 'Saudi Arabian Airlines',
    flightNumber: '',
    route: 'DAC → ',
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    departureTime: '10:00',
  });

  const updateAdditionalService = (id: string, patch: Partial<AdditionalServiceLine>) => {
    setAdditionalServices((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };  const selectedService = services.find((s) => s.id === serviceId);
  const isFlightService =
    selectedService?.category === 'Air Ticket' ||
    selectedService?.name.toLowerCase().includes('ticket') ||
    selectedService?.name.toLowerCase().includes('flight');
  // Passport is required only for air-ticket and ticket-related services.
  const isTicketRelatedService = (() => {
    const serviceName = (selectedService?.name || '').toLowerCase();
    const serviceCategory = (selectedService?.category || '').toLowerCase();
    return isFlightService ||
      serviceName.includes('reissue') ||
      serviceName.includes('refund') ||
      serviceName.includes('void') ||
      serviceName.includes('date change') ||
      serviceName.includes('ticket') ||
      serviceName.includes('flight') ||
      serviceCategory.includes('air ticket');
  })();

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

  // Account-funded cost (used when Vendor is unchecked)
  const [accountCost, setAccountCost] = useState<number | ''>('');
  const [accountCostPaymentMethod, setAccountCostPaymentMethod] = useState<PaymentMethod>('bKash');

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
  const [setAppointment, setSetAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentNote, setAppointmentNote] = useState('');

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

  const numAccountCost = hasVendor ? 0 : Number(accountCost) || 0;
  const grossProfit = numSellingPrice - numVendorCost - numAccountCost;

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
        accountCost: numAccountCost,
        accountCostPaymentMethod,
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
      const created = USE_SERVER_API ? await createOneEntryAsync(input) : createOneEntry(input);
      let lastTx = created;
      if (setAppointment) {
        await createAppointment({ customerId: created.customerId, transactionId: created.id, serviceId: created.serviceId, serviceName: created.serviceName, customerName: created.customerName, customerMobile: created.customerMobile, customerEmail: customerEmail || undefined, title: `${created.serviceName} Appointment`, appointmentDate, appointmentTime, note: appointmentNote || description || `Scheduled ${created.serviceName}`, status: 'pending' });
      }

      // Additional services are saved as separate linked transaction records under the same customer.
      // This preserves clean Customer/Vendor ledgers and keeps each service's vendor/cost independent.
      for (const line of additionalServices) {
        const lineService = services.find((s) => s.id === line.serviceId);
        const lineTicket = (() => {
          const n = (lineService?.name || '').toLowerCase();
          const cat = (lineService?.category || '').toLowerCase();
          return n.includes('ticket') || n.includes('flight') || n.includes('reissue') ||
            n.includes('refund') || n.includes('void') || n.includes('date change') || cat.includes('air ticket');
        })();
        const lineSelling = Number(line.sellingPrice) || 0;
        const linePaid = Number(line.customerPaid) || 0;
        if (lineSelling <= 0) throw new Error(`Please enter a valid selling price for ${lineService?.name || 'additional service'}.`);
        if (lineTicket && !line.pnr.trim()) throw new Error(`PNR is required for ${lineService?.name || 'ticket service'}.`);

        const lineInput: Parameters<typeof createOneEntry>[0] = {
          customerMode: 'existing',
          customerId: created.customerId,
          customerName: customerQuery,
          customerMobile,
          customerEmail,
          customerAddress,
          customerPassportNumber: customerPassport,
          customerPassportExpiry: customerPassportExpiry,
          serviceId: line.serviceId,
          serviceName: lineService?.name || 'General Service',
          description: line.description || lineService?.name || 'Additional Service',
          isFlight: lineTicket,
          flightDetails: lineTicket ? {
            pnr: line.pnr.trim().toUpperCase(),
            ticketNumber: line.ticketNumber.trim(),
            passengerName: line.passengerName.trim() || customerQuery.trim(),
            airline: line.airline.trim(),
            flightNumber: line.flightNumber.trim().toUpperCase(),
            route: line.route.trim().toUpperCase(),
            departureDate: line.departureDate,
            departureTime: line.departureTime,
            flightClass: 'Economy (V)',
            ticketStatus: 'Confirmed',
            notes: '',
          } : undefined,
          sellingPrice: lineSelling,
          customerPaid: linePaid,
          customerPaymentMethod: line.customerPaymentMethod,
          hasVendor: line.hasVendor,
          vendorMode: 'new',
          vendorName: line.hasVendor ? line.vendorName.trim() : '',
          vendorMobile: '',
          vendorCompany: '',
          vendorCost: line.hasVendor ? (Number(line.vendorCost) || 0) : 0,
          vendorPaid: line.hasVendor ? (Number(line.vendorPaid) || 0) : 0,
          vendorPaymentMethod: line.vendorPaymentMethod,
          accountCost: line.hasVendor ? 0 : (Number(line.accountCost) || 0),
          accountCostPaymentMethod: line.accountCostPaymentMethod,
          reminderDate: linePaid < lineSelling ? reminderDate : undefined,
          reminderTime: linePaid < lineSelling ? reminderTime : undefined,
          reminderNote: linePaid < lineSelling ? ('Collect remaining balance ' + formatCurrency(Math.max(0, lineSelling - linePaid))) : undefined,
          notes: generalNotes,
        };
        lastTx = USE_SERVER_API ? await createOneEntryAsync(lineInput) : createOneEntry(lineInput);
      }
      setCreatedTx(lastTx);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Entry could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCreatedTx(null);
    setSetAppointment(false);
    setAppointmentDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAppointmentTime('10:00');
    setAppointmentNote('');
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
    setAccountCost('');
    setAccountCostPaymentMethod('bKash');
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
    setAdditionalServices([]);
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

            {isTicketRelatedService && (
              <>
                {/* Passport Number */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Passport Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isTicketRelatedService}
                    value={customerPassport}
                    placeholder="e.g. A03891244"
                    onChange={(e) => setCustomerPassport(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                {/* Passport Expiry */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Passport Expiry <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required={isTicketRelatedService}
                    value={customerPassportExpiry}
                    onChange={(e) => setCustomerPassportExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

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
                {hasVendor ? 'Formula: Due = Cost - Paid' : 'No Vendor → Account-funded Cost'}
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
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-xs font-semibold text-slate-700">In-house / Account-funded Cost (No Vendor)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cost from Account (৳)</label>
                    <input type="number" min="0" value={accountCost} onChange={(e) => setAccountCost(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Account</label>
                    <select value={accountCostPaymentMethod} onChange={(e) => setAccountCostPaymentMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">
                      <option value="Cash">Cash</option><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Rocket">Rocket</option><option value="Bank">Bank</option><option value="Card">Card</option><option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">This amount reduces the selected account and is included in Profit, but creates no Vendor Ledger entry.</div>
              </div>
            )}
          </div>
        </div>

        {/* ADDITIONAL SERVICES */}
        {additionalServices.length > 0 && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-900 uppercase">Additional Services</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Same customer • each service gets its own vendor, cost, payment & ledger record.</div>
              </div>
              <button type="button" onClick={() => setAdditionalServices((rows) => rows.filter((r) => r.id !== additionalServices[additionalServices.length - 1]?.id))} className="text-xs text-rose-600 font-semibold">Remove Last</button>
            </div>

            {additionalServices.map((line, index) => {
              const s = services.find((x) => x.id === line.serviceId);
              const name = (s?.name || '').toLowerCase();
              const cat = (s?.category || '').toLowerCase();
              const ticket = name.includes('ticket') || name.includes('flight') || name.includes('reissue') || name.includes('refund') || name.includes('void') || name.includes('date change') || cat.includes('air ticket');
              const due = Math.max(0, (Number(line.sellingPrice) || 0) - (Number(line.customerPaid) || 0));
              const cost = line.hasVendor ? (Number(line.vendorCost) || 0) : (Number(line.accountCost) || 0);
              const profit = (Number(line.sellingPrice) || 0) - cost;
              return (
                <div key={line.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Service #{index + 2}</span>
                    <button type="button" onClick={() => setAdditionalServices((rows) => rows.filter((r) => r.id !== line.id))} className="p-1 text-slate-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select value={line.serviceId} onChange={(e) => updateAdditionalService(line.id, { serviceId: e.target.value })} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">
                      {services.filter((x) => x.enabled).sort((a,b) => a.order-b.order).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.category})</option>)}
                    </select>
                    <input value={line.description} onChange={(e) => updateAdditionalService(line.id, { description: e.target.value })} placeholder="Service description" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg" />
                  </div>

                  {ticket && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <input required value={line.pnr} onChange={(e) => updateAdditionalService(line.id, { pnr: e.target.value.toUpperCase() })} placeholder="PNR *" className="px-2 py-1.5 text-xs border rounded-lg font-mono uppercase" />
                      <input value={line.ticketNumber} onChange={(e) => updateAdditionalService(line.id, { ticketNumber: e.target.value })} placeholder="Ticket No." className="px-2 py-1.5 text-xs border rounded-lg" />
                      <input value={line.flightNumber} onChange={(e) => updateAdditionalService(line.id, { flightNumber: e.target.value.toUpperCase() })} placeholder="Flight No." className="px-2 py-1.5 text-xs border rounded-lg font-mono uppercase" />
                      <input value={line.route} onChange={(e) => updateAdditionalService(line.id, { route: e.target.value.toUpperCase() })} placeholder="DAC → DMM" className="px-2 py-1.5 text-xs border rounded-lg font-mono uppercase" />
                      <input value={line.airline} onChange={(e) => updateAdditionalService(line.id, { airline: e.target.value })} placeholder="Airline" className="px-2 py-1.5 text-xs border rounded-lg" />
                      <input type="date" value={line.departureDate} onChange={(e) => updateAdditionalService(line.id, { departureDate: e.target.value })} className="px-2 py-1.5 text-xs border rounded-lg" />
                      <input type="time" value={line.departureTime} onChange={(e) => updateAdditionalService(line.id, { departureTime: e.target.value })} className="px-2 py-1.5 text-xs border rounded-lg" />
                      <input value={line.passengerName} onChange={(e) => updateAdditionalService(line.id, { passengerName: e.target.value })} placeholder="Passenger Name" className="px-2 py-1.5 text-xs border rounded-lg" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div><label className="text-[11px] font-medium">Selling Price</label><input type="number" min="0" value={line.sellingPrice} onChange={(e) => updateAdditionalService(line.id, { sellingPrice: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-2 py-2 text-sm font-bold border rounded-lg" /></div>
                    <div><label className="text-[11px] font-medium">Customer Paid</label><input type="number" min="0" value={line.customerPaid} onChange={(e) => updateAdditionalService(line.id, { customerPaid: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-2 py-2 text-sm font-bold border rounded-lg text-emerald-600" /></div>
                    <div><label className="text-[11px] font-medium">Payment Method</label><select value={line.customerPaymentMethod} onChange={(e) => updateAdditionalService(line.id, { customerPaymentMethod: e.target.value as PaymentMethod })} className="w-full px-2 py-2 text-xs border rounded-lg"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select></div>
                    <div className="px-2 py-2 rounded-lg bg-slate-50 border text-xs"><span className="text-slate-500">Due</span><div className={due > 0 ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>{formatCurrency(due)}</div></div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={line.hasVendor} onChange={(e) => updateAdditionalService(line.id, { hasVendor: e.target.checked })} /> Vendor for this service</label>
                    <span className="text-slate-500">Vendor can be different for every service.</span>
                  </div>

                  {line.hasVendor ? (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input list="siam-vendor-list" value={line.vendorName} onChange={(e) => updateAdditionalService(line.id, { vendorName: e.target.value })} placeholder="Vendor / Agency" className="px-2 py-2 text-xs border rounded-lg" />
                      <input type="number" min="0" value={line.vendorCost} onChange={(e) => updateAdditionalService(line.id, { vendorCost: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Vendor Cost" className="px-2 py-2 text-xs border rounded-lg" />
                      <input type="number" min="0" value={line.vendorPaid} onChange={(e) => updateAdditionalService(line.id, { vendorPaid: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Vendor Paid" className="px-2 py-2 text-xs border rounded-lg" />
                      <select value={line.vendorPaymentMethod} onChange={(e) => updateAdditionalService(line.id, { vendorPaymentMethod: e.target.value as PaymentMethod })} className="px-2 py-2 text-xs border rounded-lg"><option>Bank</option><option>bKash</option><option>Cash</option><option>Nagad</option><option>Rocket</option><option>Other</option></select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <input type="number" min="0" value={line.accountCost} onChange={(e) => updateAdditionalService(line.id, { accountCost: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Cost from Account" className="px-2 py-2 text-xs border rounded-lg" />
                      <select value={line.accountCostPaymentMethod} onChange={(e) => updateAdditionalService(line.id, { accountCostPaymentMethod: e.target.value as PaymentMethod })} className="px-2 py-2 text-xs border rounded-lg"><option>Cash</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option><option>Card</option><option>Other</option></select>
                    </div>
                  )}
                  <div className="text-[11px] font-semibold text-slate-600">Service Profit: <span className={profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatCurrency(profit)}</span></div>
                </div>
              );
            })}
          </div>
        )}

        <datalist id="siam-vendor-list">
          {vendors.map((v) => <option key={v.id} value={v.name}>{v.company || v.mobile}</option>)}
        </datalist>

        <div className="flex justify-center">
          <button type="button" onClick={() => setAdditionalServices((rows) => [...rows, createAdditionalServiceLine()])} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
            <PlusCircle className="w-4 h-4" /> + Add Another Service
          </button>
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
              {grossProfit >= 0 ? 'Net positive gross margin' : 'Deficit / Loss warning'} (Selling Price {formatCurrency(numSellingPrice)} - Cost {formatCurrency(numVendorCost + numAccountCost)})
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

        {/* 7. SERVICE APPOINTMENT / SCHEDULE */}
        <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/60 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-violet-900 uppercase">
            <input type="checkbox" checked={setAppointment} onChange={(e) => setSetAppointment(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
            <Calendar className="w-4 h-4" />
            <span>Service Appointment / Schedule</span>
          </label>
          <p className="text-[11px] text-violet-700">Schedule any service here. It will automatically appear in Calendar and Appointment Reminders.</p>
          {setAppointment && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Appointment Date</label><input type="date" value={appointmentDate} onChange={(e)=>setAppointmentDate(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white" required /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Appointment Time</label><input type="time" value={appointmentTime} onChange={(e)=>setAppointmentTime(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white" required /></div>
              <div><label className="block text-xs font-medium text-slate-700 mb-1">Schedule Note</label><input type="text" value={appointmentNote} onChange={(e)=>setAppointmentNote(e.target.value)} placeholder="Visa / medical / passport / interview / collection..." className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white" /></div>
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
