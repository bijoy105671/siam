export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Card' | 'Other';

export type TicketStatus = 
  | 'Confirmed' 
  | 'Schedule Changed' 
  | 'Reissued' 
  | 'Refund' 
  | 'Void' 
  | 'Cancelled' 
  | 'Completed' 
  | 'Other';

export type TransactionStatus = 'PAID' | 'PARTIAL' | 'DUE' | 'REFUND' | 'CANCELLED';

export type UserRole = 'admin' | 'staff';

export interface UserPermissions {
  canCreateTransaction: boolean;
  canEditTransaction: boolean;
  canDeleteTransaction: boolean;
  canManageExpenses: boolean;
  canManageTransfers: boolean;
  canManageSettings: boolean;
  canViewAudit: boolean;
  canBackupRestore: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  nid?: string;
  passportNumber?: string;
  passportExpiry?: string;
  photo?: string;
  notes?: string;
  openingDue: number;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  company?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  accountInfo?: string;
  openingPayable: number;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Air Ticket' | 'Visa' | 'Passport' | 'Digital' | 'Other';
  enabled: boolean;
  order: number;
}

export interface FlightDetails {
  pnr: string;
  ticketNumber: string;
  passengerName: string;
  airline: string;
  flightNumber: string;
  route: string; // e.g., "DAC - JED"
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:MM
  arrivalDate?: string;
  arrivalTime?: string;
  flightClass?: string;
  sector?: string;
  ticketStatus: TicketStatus;
  statusHistory?: {
    status: TicketStatus;
    changedAt: string;
    changedBy: string;
    note?: string;
  }[];
  notes?: string;
}

export interface PartialPayment {
  id: string;
  transactionId: string;
  paymentType: 'customer' | 'vendor';
  entityId: string; // customerId or vendorId
  entityName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  recordedBy: string;
  note?: string;
  reference?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdBy: string;
  
  // Customer & Service
  customerId: string;
  customerName: string;
  customerMobile: string;
  serviceId: string;
  serviceName: string;
  description?: string;
  
  // Optional Flight details
  flightDetails?: FlightDetails;
  
  // Customer Financials
  sellingPrice: number;
  customerPaid: number;
  customerDue: number; // sellingPrice - customerPaid
  customerPaymentMethod: PaymentMethod;
  
  // Vendor Financials
  vendorId?: string;
  vendorName?: string;
  vendorCost: number;
  vendorPaid: number;
  vendorDue: number; // vendorCost - vendorPaid
  vendorPaymentMethod?: PaymentMethod;
  
  // Profit calculations
  grossProfit: number; // sellingPrice - vendorCost
  
  // Reminder Details
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:MM
  reminderStatus?: 'pending' | 'completed' | 'snoozed';
  reminderNote?: string;
  
  status: TransactionStatus;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  note?: string;
  createdBy: string;
}

export type LoanAdvancePartyType = 'customer' | 'vendor';
export type LoanAdvanceKind = 'advance' | 'loan';
export type LoanAdvanceDirection = 'received' | 'given';

export interface LoanAdvanceRecord {
  id: string;
  partyType: LoanAdvancePartyType;
  partyId: string;
  partyName: string;
  kind: LoanAdvanceKind;
  direction: LoanAdvanceDirection;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  note?: string;
  reference?: string;
  createdBy: string;
}

export interface LoanAdvanceAdjustment {
  id: string;
  loanAdvanceId: string;
  transactionId: string;
  partyType: LoanAdvancePartyType;
  partyId: string;
  amount: number;
  date: string;
  time: string;
  note?: string;
  createdBy: string;
}

export interface FundTransfer {
  id: string;
  fromAccount: PaymentMethod;
  toAccount: PaymentMethod;
  amount: number;
  date: string;
  time: string;
  reason: string;
  note?: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  date: string;
  time: string;
  recordType: 'Transaction' | 'Customer' | 'Vendor' | 'Payment' | 'Expense' | 'Transfer' | 'LoanAdvance' | 'Service' | 'User' | 'Settings';
  recordId: string;
  previousValue?: string;
  newValue?: string;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  logoUrl: string;
  address: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  currencySymbol: string;
  currencyName: string;
  defaultReminderDays: number;
  invoiceTerms: string;
  signatureLabel: string;
  templates: {
    customerDueReminder: string;
    vendorDueReminder: string;
    paymentReceived: string;
    paymentCompletedThankYou: string;
    flightReminder: string;
    scheduleChangeNotice: string;
    refundVoidNotification: string;
    invoiceShare?: string;
  };
}

export interface AccountBalances {
  Cash: number;
  bKash: number;
  Nagad: number;
  Rocket: number;
  Bank: number;
  Card: number;
  Other: number;
}

export type BackupDestination = 'email' | 'cloud' | 'both';
export type CloudProvider = 'google_drive' | 'dropbox' | 'aws_s3' | 'onedrive';

export interface AutomatedBackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'twice_daily' | 'weekly';
  scheduledTime: string; // HH:mm format e.g. "23:00"
  backupDestination: BackupDestination;
  emailConfig: {
    recipientEmail: string;
    ccEmail?: string;
    senderName: string;
    includeChecksum: boolean;
    sendAlertOnFailure: boolean;
  };
  cloudConfig: {
    provider: CloudProvider;
    folderPath: string;
    bucketName?: string;
    autoPurgeDays: number;
    connectedAccount?: string;
    isConnected: boolean;
  };
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256-GCM';
    passphrase: string;
    keyHint?: string;
    lastPassphraseUpdate?: string;
  };
  lastRunTimestamp?: string;
  lastRunStatus?: 'success' | 'failed' | 'in_progress';
  lastRunMessage?: string;
  lastBackupSizeKb?: number;
  lastBackupChecksum?: string;
  nextRunTimestamp?: string;
  totalAutomatedRuns: number;
}

export interface BackupExecutionLog {
  id: string;
  timestamp: string;
  triggerType: 'automated_schedule' | 'manual_admin';
  status: 'success' | 'failed';
  destination: BackupDestination;
  destinationsDelivered: string[];
  fileSizeKb: number;
  encrypted: boolean;
  encryptionAlgorithm?: string;
  checksumSha256: string;
  details: string;
  fileName: string;
}
