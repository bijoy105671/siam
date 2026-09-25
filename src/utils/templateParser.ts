import { BusinessSettings, Customer, Transaction, Vendor } from '../types';
import { formatCurrency, formatDate, formatTime } from './formatters';

export interface TemplateVariables {
  customer_name?: string;
  customer_mobile?: string;
  vendor_name?: string;
  amount?: string;
  total_sale?: string;
  paid_amount?: string;
  due_amount?: string;
  vendor_cost?: string;
  vendor_due?: string;
  payment_method?: string;
  pnr?: string;
  ticket_number?: string;
  flight_number?: string;
  airline?: string;
  route?: string;
  flight_date?: string;
  flight_time?: string;
  ticket_status?: string;
  invoice_no?: string;
  invoice_number?: string;
  service_name?: string;
  business_name?: string;
  business_phone?: string;
  business_whatsapp?: string;
  business_email?: string;
  business_address?: string;
  verification_url?: string;
  overdue_days?: string;
  date?: string;
}

export interface VariableDescriptor {
  key: keyof TemplateVariables;
  placeholder: string;
  label: string;
  category: 'Customer' | 'Financial' | 'Invoice' | 'Flight' | 'Business';
  example: string;
}

export const AVAILABLE_TEMPLATE_VARIABLES: VariableDescriptor[] = [
  { key: 'customer_name', placeholder: '{{customer_name}}', label: 'Customer Name', category: 'Customer', example: 'Rahim Ahmed' },
  { key: 'customer_mobile', placeholder: '{{customer_mobile}}', label: 'Customer Mobile', category: 'Customer', example: '01812345678' },
  
  { key: 'amount', placeholder: '{{amount}}', label: 'Total Amount / Bill', category: 'Financial', example: '৳ 45,000' },
  { key: 'due_amount', placeholder: '{{due_amount}}', label: 'Due / Outstanding', category: 'Financial', example: '৳ 15,000' },
  { key: 'paid_amount', placeholder: '{{paid_amount}}', label: 'Paid Amount', category: 'Financial', example: '৳ 30,000' },
  { key: 'payment_method', placeholder: '{{payment_method}}', label: 'Payment Method', category: 'Financial', example: 'bKash' },
  
  { key: 'invoice_number', placeholder: '{{invoice_number}}', label: 'Invoice Number', category: 'Invoice', example: 'SIAM-1001' },
  { key: 'service_name', placeholder: '{{service_name}}', label: 'Service Name', category: 'Invoice', example: 'Air Ticket (DAC - JED)' },
  { key: 'date', placeholder: '{{date}}', label: 'Invoice Date', category: 'Invoice', example: '25 Sep 2026' },
  { key: 'verification_url', placeholder: '{{verification_url}}', label: 'Verification URL', category: 'Invoice', example: 'https://verify.siamair.com' },
  { key: 'overdue_days', placeholder: '{{overdue_days}}', label: 'Overdue Days', category: 'Invoice', example: '3' },

  { key: 'flight_number', placeholder: '{{flight_number}}', label: 'Flight Number', category: 'Flight', example: 'SV-805' },
  { key: 'airline', placeholder: '{{airline}}', label: 'Airline', category: 'Flight', example: 'Saudia Airlines' },
  { key: 'route', placeholder: '{{route}}', label: 'Route', category: 'Flight', example: 'DAC - JED' },
  { key: 'pnr', placeholder: '{{pnr}}', label: 'PNR Code', category: 'Flight', example: 'P7X9WQ' },
  { key: 'ticket_number', placeholder: '{{ticket_number}}', label: 'Ticket Number', category: 'Flight', example: '065-2415891234' },
  { key: 'flight_date', placeholder: '{{flight_date}}', label: 'Departure Date', category: 'Flight', example: '15 Oct 2026' },
  { key: 'flight_time', placeholder: '{{flight_time}}', label: 'Departure Time', category: 'Flight', example: '10:30 PM' },
  { key: 'ticket_status', placeholder: '{{ticket_status}}', label: 'Ticket Status', category: 'Flight', example: 'Confirmed' },

  { key: 'business_name', placeholder: '{{business_name}}', label: 'Business Name', category: 'Business', example: 'SIAM AIR & DIGITAL SERVICE' },
  { key: 'business_phone', placeholder: '{{business_phone}}', label: 'Helpline Number', category: 'Business', example: '+880 1812-345678' },
  { key: 'business_whatsapp', placeholder: '{{business_whatsapp}}', label: 'Agency WhatsApp', category: 'Business', example: '+880 1812-345678' },
  { key: 'business_address', placeholder: '{{business_address}}', label: 'Agency Address', category: 'Business', example: 'Dhaka, Bangladesh' },
];

export const extractVariables = (
  transaction?: Transaction | null,
  customer?: Customer | null,
  vendor?: Vendor | null,
  settings?: BusinessSettings | null,
  extra?: Partial<TemplateVariables>
): TemplateVariables => {
  const invNumber = transaction?.invoiceNumber || '';
  const totalAmount = transaction ? formatCurrency(transaction.sellingPrice) : '৳0';
  const paidAmount = transaction ? formatCurrency(transaction.customerPaid) : '৳0';
  const dueAmount = transaction ? formatCurrency(transaction.customerDue) : '৳0';

  let overdueDaysStr = '0';
  if (transaction?.reminderDate && transaction.customerDue > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (transaction.reminderDate < todayStr) {
      const rDate = new Date(transaction.reminderDate);
      const cDate = new Date(todayStr);
      const days = Math.max(1, Math.round((cDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24)));
      overdueDaysStr = String(days);
    }
  }

  const vars: TemplateVariables = {
    customer_name: customer?.name || transaction?.customerName || 'Valued Customer',
    customer_mobile: customer?.mobile || transaction?.customerMobile || '',
    vendor_name: vendor?.name || transaction?.vendorName || '',
    total_sale: totalAmount,
    amount: totalAmount,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    vendor_cost: transaction ? formatCurrency(transaction.vendorCost) : '৳0',
    vendor_due: transaction ? formatCurrency(transaction.vendorDue) : '৳0',
    payment_method: transaction?.customerPaymentMethod || 'Cash',
    invoice_no: invNumber,
    invoice_number: invNumber,
    service_name: transaction?.serviceName || '',
    business_name: settings?.name || 'SIAM AIR & DIGITAL SERVICE',
    business_phone: settings?.mobile || '',
    business_whatsapp: settings?.whatsapp || settings?.mobile || '',
    business_email: settings?.email || '',
    business_address: settings?.address || '',
    date: formatDate(transaction?.date || new Date().toISOString().split('T')[0]),
    overdue_days: overdueDaysStr,
    verification_url: '',
    ...extra,
  };

  if (transaction?.flightDetails) {
    const f = transaction.flightDetails;
    vars.pnr = f.pnr || 'N/A';
    vars.ticket_number = f.ticketNumber || 'N/A';
    vars.flight_number = f.flightNumber || 'N/A';
    vars.airline = f.airline || 'N/A';
    vars.route = f.route || 'N/A';
    vars.flight_date = formatDate(f.departureDate);
    vars.flight_time = formatTime(f.departureTime);
    vars.ticket_status = f.ticketStatus;
  }

  return vars;
};

/**
 * Replaces both {{variable_name}} and {variable_name} with their corresponding dynamic values.
 */
export const parseTemplate = (
  template: string,
  variables: TemplateVariables
): string => {
  if (!template) return '';
  return template.replace(/\{{1,2}([a-zA-Z0-9_]+)\}{1,2}/g, (match, key) => {
    const val = (variables as Record<string, string | undefined>)[key];
    return val !== undefined ? String(val) : match;
  });
};

