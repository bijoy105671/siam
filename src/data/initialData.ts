import {
  AuditLog, AutomatedBackupSchedule, BackupExecutionLog, BusinessSettings, Customer, Expense, ExpenseCategory,
  FundTransfer, PartialPayment, PaymentMethod, ServiceItem, Transaction, User, Vendor,
} from '../types';

export const INITIAL_SETTINGS: BusinessSettings = {
  name: 'SIAM AIR & DIGITAL SERVICE',
  tagline: 'Air Ticket · Visa Processing · Passport & Digital Solutions',
  logoUrl: '/src/assets/images/siam_air_logo_1790325286013.jpg',
  whatsappQrCode: '',
  address: 'Shop #12, 1st Floor, Central Plaza, Main Road, Dhaka, Bangladesh',
  mobile: '+880 1812-345678',
  whatsapp: '+880 1812-345678',
  email: 'siamairservice@gmail.com', website: 'www.siamairservice.com', invoicePrefix: 'SIAM-', invoiceStartNumber: 1001,
  currencySymbol: '৳', currencyName: 'BDT', defaultReminderDays: 3,
  invoiceTerms: '1. All tickets are subject to airline fare rules and cancellation policies.\n2. Passports and documents must be collected in person with this original invoice.\n3. Digital services & government fee payments are strictly non-refundable.\n4. Thank you for flying & doing business with SIAM AIR & DIGITAL SERVICE!',
  signatureLabel: 'Authorized Officer / Seal',
  templates: {
    invoiceShare: 'Dear {{customer_name}}, here is your invoice {{invoice_number}} from {{business_name}} for {{service_name}}.\nTotal Amount: {{amount}}\nPaid: {{paid_amount}}\nDue Balance: {{due_amount}}\n\nVerify authenticity online:\n{{verification_url}}\n\nHelpline: {{business_phone}}. Thank you for choosing {{business_name}}!',
    customerDueReminder: 'Dear {{customer_name}}, reminder from {{business_name}}: You have an outstanding due of {{due_amount}} for {{service_name}} (Invoice: {{invoice_number}}). Kindly clear the payment at your earliest convenience. Helpline: {{business_phone}}. Thank you!',
    vendorDueReminder: 'Attn: {{vendor_name}}, greeting from {{business_name}}. Our records indicate payable balance of {{vendor_due}} against Ref/PNR {{pnr}}. Please confirm receipt of our upcoming bank transfer.',
    paymentReceived: 'Dear {{customer_name}}, we received {{paid_amount}} via {{payment_method}} for Invoice {{invoice_number}}. Remaining Due: {{due_amount}}. Thank you for choosing {{business_name}}!',
    paymentCompletedThankYou: 'Dear {{customer_name}}, thank you! Your payment of {{paid_amount}} for Invoice {{invoice_number}} is fully settled. Your balance is ৳0 (PAID in Full). Safe travels from {{business_name}}!',
    flightReminder: 'FLIGHT REMINDER: Dear {{customer_name}}, your flight {{flight_number}} ({{airline}}) on route {{route}} departs on {{flight_date}} at {{flight_time}}. PNR: {{pnr}}, Ticket: {{ticket_number}}. Please arrive at airport 4 hours before departure. Wish you a safe journey! - {{business_name}}',
    scheduleChangeNotice: 'URGENT SCHEDULE UPDATE: Dear {{customer_name}}, your flight {{flight_number}} (PNR: {{pnr}}) schedule has been updated to {{flight_date}} at {{flight_time}}. Please contact {{business_name}} immediately at {{business_phone}}.',
    refundVoidNotification: 'Dear {{customer_name}}, your refund/void request for PNR {{pnr}} ({{airline}}) has been processed. Refund Amount: {{amount}}. Net adjustment updated. Regards, {{business_name}}.',
  },
};

