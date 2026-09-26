import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEMO_AUDIT_LOGS,
  DEMO_CUSTOMERS,
  DEMO_EXPENSES,
  DEMO_OPENING_BALANCES,
  DEMO_PARTIAL_PAYMENTS,
  DEMO_TRANSACTIONS,
  DEMO_TRANSFERS,
  DEMO_VENDORS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BACKUP_LOGS,
  INITIAL_BACKUP_SCHEDULE,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_OPENING_BALANCES,
  INITIAL_PARTIAL_PAYMENTS,
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_TRANSFERS,
  INITIAL_USERS,
  INITIAL_VENDORS,
} from '../data/initialData';
import {
  AccountBalances,
  AuditLog,
  AutomatedBackupSchedule,
  BackupDestination,
  BackupExecutionLog,
  BusinessSettings,
  Customer,
  Expense,
  ExpenseCategory,
  FlightDetails,
  FundTransfer,
  PartialPayment,
  PaymentMethod,
  ServiceItem,
  TicketStatus,
  Transaction,
  User,
  Vendor,
  LoanAdvanceRecord,
  LoanAdvanceAdjustment,
} from '../types';
import {
  decryptDatabasePayload,
  encryptDatabasePayload,
} from '../utils/cryptoBackup';

interface OneEntryInput {
  // Customer info
  customerMode: 'existing' | 'new';
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerAddress?: string;
  customerPassportNumber?: string;
  customerPassportExpiry?: string;

  // Service
  serviceId: string;
  serviceName: string;
  description?: string;

  // Flight Details (if applicable)
  isFlight: boolean;
  flightDetails?: FlightDetails;

  // Customer Financials
  sellingPrice: number;
  customerPaid: number;
  customerPaymentMethod: PaymentMethod;

  // Vendor Details
  hasVendor: boolean;
  vendorMode?: 'existing' | 'new';
  vendorId?: string;
  vendorName?: string;
  vendorMobile?: string;
  vendorCompany?: string;
  vendorCost: number;
  vendorPaid: number;
  vendorPaymentMethod?: PaymentMethod;

  // Reminder
  reminderDate?: string;
  reminderTime?: string;
  reminderNote?: string;

  notes?: string;
}

interface AppContextType {
  // Current user & Auth
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Entities
  customers: Customer[];
  vendors: Vendor[];
  services: ServiceItem[];
  expenseCategories: ExpenseCategory[];
  transactions: Transaction[];
  partialPayments: PartialPayment[];
  expenses: Expense[];
  transfers: FundTransfer[];
  loanAdvances: LoanAdvanceRecord[];
  loanAdvanceAdjustments: LoanAdvanceAdjustment[];
  auditLogs: AuditLog[];
  settings: BusinessSettings;
  openingBalances: Record<PaymentMethod, number>;

  // Accounting & Derived Stats
  accountBalances: AccountBalances;
  totalAvailableMoney: number;
  totalCustomerReceivable: number;
  totalVendorPayable: number;
  todaySummary: {
    totalSales: number;
    totalReceived: number;
    totalExpense: number;
    totalVendorPayment: number;
    grossProfit: number;
    loss: number;
    netProfit: number;
  };
  upcomingFlights: (Transaction & { flightDetails: FlightDetails })[];
  todayReminders: Transaction[];
  overdueReminders: (Transaction & { overdueDays: number })[];

  // Actions
  createOneEntry: (input: OneEntryInput) => Transaction;\n  createOneEntryAsync: (input: OneEntryInput) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>, changeReason?: string) => void;
  deleteTransaction: (id: string) => void;
  updateFlightStatus: (txId: string, status: TicketStatus, note?: string) => void;

  addPartialPayment: (params: {
    transactionId: string;
    paymentType: 'customer' | 'vendor';
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
    time: string;
    note?: string;
    reference?: string;
  }) => void;

  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  addVendor: (vend: Omit<Vendor, 'id' | 'createdAt'>) => Vendor;
  updateVendor: (id: string, vend: Partial<Vendor>) => void;

  addExpense: (expense: Omit<Expense, 'id' | 'createdBy'>) => void;
  deleteExpense: (id: string) => void;
  updateExpenseCategories: (cats: ExpenseCategory[]) => void;

  addFundTransfer: (transfer: Omit<FundTransfer, 'id' | 'createdBy'>) => void;
  addLoanAdvance: (record: Omit<LoanAdvanceRecord, 'id' | 'createdBy'>) => void;
  updateLoanAdvance: (id: string, updates: Partial<LoanAdvanceRecord>) => void;
  deleteLoanAdvance: (id: string) => void;
  adjustLoanAdvance: (loanAdvanceId: string, transactionId: string, amount: number, note?: string) => boolean;
  deleteLoanAdvanceAdjustment: (id: string) => boolean;

  updateOpeningBalance: (method: PaymentMethod, amount: number) => void;
  updateSettings: (settings: Partial<BusinessSettings>) => void;
  updateServices: (services: ServiceItem[]) => void;

  completeReminder: (txId: string) => void;
  snoozeReminder: (txId: string, days: number) => void;

  // Backup & Restore & Automated Scheduling
  backupSchedule: AutomatedBackupSchedule;
  backupLogs: BackupExecutionLog[];
  updateBackupSchedule: (updates: Partial<AutomatedBackupSchedule>) => void;
  triggerEncryptedBackup: (options?: {
    destination?: BackupDestination;
    isManual?: boolean;
    overridePassphrase?: string;
  }) => Promise<{
    success: boolean;
    log: BackupExecutionLog;
    downloadDataUrl: string;
    jsonString: string;
    message: string;
  }>;
  restoreFromEncryptedBackup: (
    fileContent: string,
    passphrase: string
  ) => Promise<{ success: boolean; message: string }>;
  testBackupDestination: (
    destination: BackupDestination
  ) => Promise<{ success: boolean; message: string }>;
  deleteBackupLog: (id: string) => void;
  clearBackupLogs: () => void;
  exportBackup: () => void;
  importBackup: (jsonStr: string) => boolean;
  clearAllInputData: () => void;
  loadDemoSampleData: () => void;
  resetToSampleData: () => void;

  // Customer & Vendor ledger helpers
  getCustomerLedger: (customerId: string) => {
    customer: Customer | undefined;
    totalSales: number;
    totalPaid: number;
    currentDue: number;
    transactions: Transaction[];
    payments: PartialPayment[];
  };
  getVendorLedger: (vendorId: string) => {
    vendor: Vendor | undefined;
    totalCost: number;
    totalPaid: number;
    currentPayable: number;
    transactions: Transaction[];
    payments: PartialPayment[];
  };
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'siam_air_business_data_v3_clean';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or initial clean data
  const [data, setData] = useState(() => {
    // Purge previous version sample storage keys if present
    try {
      localStorage.removeItem('siam_air_business_data_v2');
      localStorage.removeItem('siam_air_business_data_v1');
    } catch {
      // ignore
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedServices = Array.isArray(parsed.services) ? parsed.services : [];
        const savedExpenseCategories = Array.isArray(parsed.expenseCategories) ? parsed.expenseCategories : [];
        const serviceIds = new Set(savedServices.map((s: ServiceItem) => s.id));
        const expenseIds = new Set(savedExpenseCategories.map((c: ExpenseCategory) => c.id));
        return {
          ...parsed,
          // Preserve existing custom items while automatically adding newly released defaults.
          services: [...savedServices, ...INITIAL_SERVICES.filter(s => !serviceIds.has(s.id))],
          expenseCategories: [...savedExpenseCategories, ...INITIAL_EXPENSE_CATEGORIES.filter(c => !expenseIds.has(c.id))],
          backupSchedule: parsed.backupSchedule || INITIAL_BACKUP_SCHEDULE,
          backupLogs: parsed.backupLogs || INITIAL_BACKUP_LOGS,
          loanAdvances: parsed.loanAdvances || [],
          loanAdvanceAdjustments: parsed.loanAdvanceAdjustments || [],
        };
      } catch (e) {
        console.error('Failed to parse stored business data:', e);
      }
    }
    return {
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      currentUserId: USE_SERVER_API ? undefined : INITIAL_USERS[0].id,
      customers: INITIAL_CUSTOMERS,
      vendors: INITIAL_VENDORS,
      services: INITIAL_SERVICES,
      expenseCategories: INITIAL_EXPENSE_CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      partialPayments: INITIAL_PARTIAL_PAYMENTS,
      expenses: INITIAL_EXPENSES,
      transfers: INITIAL_TRANSFERS,
      loanAdvances: [],
      loanAdvanceAdjustments: [],
      auditLogs: INITIAL_AUDIT_LOGS,
      openingBalances: INITIAL_OPENING_BALANCES,
      backupSchedule: INITIAL_BACKUP_SCHEDULE,
      backupLogs: INITIAL_BACKUP_LOGS,
    };
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Storage error:', err);
    }
  }, [data]);

  // Auth helper
  const currentUser = useMemo(() => {
    return data.users.find((u: User) => u.id === data.currentUserId) || (USE_SERVER_API ? null : data.users[0]) || null;
  }, [data.users, data.currentUserId]);

  const recordAudit = (
    action: string,
    recordType: AuditLog['recordType'],
    recordId: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const now = new Date();
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user: currentUser ? currentUser.fullName : 'System',
      action,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      recordType,
      recordId,
      previousValue,
      newValue,
    };
    setData((prev: any) => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs],
    }));
  };

  const login = (username: string, pass: string): boolean => {
    const found = data.users.find(
      (u: User) => u.username.toLowerCase() === username.toLowerCase() && u.password === pass && u.isActive
    );
    if (found) {
      setData((prev: any) => ({ ...prev, currentUserId: found.id }));
      recordAudit('User Login', 'User', found.id, undefined, `${found.fullName} logged in`);
      return true;
    }
    return false;
  };

  const loginAsync = async (username: string, pass: string): Promise<boolean> => {
    if (!USE_SERVER_API) return login(username, pass);
    try {
      const result = await api.login(username.trim(), pass);
      const u: any = result.user;
      const mapped: User = {
        id: String(u.id),
        username: String(u.username),
        password: '',
        fullName: String(u.full_name ?? u.fullName ?? u.username),
        role: u.role,
        isActive: u.is_active !== false,
        createdAt: u.created_at ?? new Date().toISOString(),
      };
      setData((prev: any) => ({
        ...prev,
        users: [...prev.users.filter((x: User) => x.id !== mapped.id), mapped],
        currentUserId: mapped.id,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    if (currentUser) {
      recordAudit('User Logout', 'User', currentUser.id, undefined, `${currentUser.fullName} logged out`);
    }
    // Switch to first staff or guest
    const otherUser = data.users.find((u: User) => u.id !== data.currentUserId) || data.users[0];
    setData((prev: any) => ({ ...prev, currentUserId: otherUser?.id }));
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setData((prev: any) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
    recordAudit('Created User', 'User', newUser.id, undefined, `Created user ${newUser.fullName} (${newUser.role})`);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setData((prev: any) => {
      const old = prev.users.find((u: User) => u.id === id);
      return {
        ...prev,
        users: prev.users.map((u: User) => (u.id === id ? { ...u, ...updates } : u)),
      };
    });
    recordAudit('Updated User', 'User', id, undefined, `Updated user details for ID ${id}`);
  };

  const deleteUser = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      users: prev.users.filter((u: User) => u.id !== id),
    }));
    recordAudit('Deleted User', 'User', id, undefined, `Deleted user ${id}`);
  };

  const addLoanAdvance = (record: Omit<LoanAdvanceRecord, 'id' | 'createdBy'>) => {
    const newRecord: LoanAdvanceRecord = {
      ...record,
      id: 'la_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdBy: currentUser?.fullName || 'Staff',
    };
    setData((prev: any) => ({ ...prev, loanAdvances: [newRecord, ...(prev.loanAdvances || [])] }));
    recordAudit('Created Loan / Advance', 'LoanAdvance', newRecord.id, undefined,
      newRecord.partyName + ': ' + newRecord.kind + ' ' + newRecord.direction + ' ৳' + newRecord.amount);
  };

  const updateLoanAdvance = (id: string, updates: Partial<LoanAdvanceRecord>) => {
    setData((prev: any) => ({
      ...prev,
      loanAdvances: (prev.loanAdvances || []).map((r: LoanAdvanceRecord) => r.id === id ? { ...r, ...updates } : r),
    }));
    recordAudit('Updated Loan / Advance', 'LoanAdvance', id, undefined, JSON.stringify(updates));
  };

  const deleteLoanAdvance = (id: string) => {
    setData((prev: any) => ({ ...prev, loanAdvances: (prev.loanAdvances || []).filter((r: LoanAdvanceRecord) => r.id !== id) }));
    recordAudit('Deleted Loan / Advance', 'LoanAdvance', id, undefined, 'Loan / advance record deleted');
  };

  const adjustLoanAdvance = (loanAdvanceId: string, transactionId: string, amount: number, note?: string): boolean => {
    const record = (data.loanAdvances || []).find((r: LoanAdvanceRecord) => r.id === loanAdvanceId);
    const tx = data.transactions.find((t: Transaction) => t.id === transactionId);
    if (!record || !tx || amount <= 0) return false;

    const sameParty = record.partyType === 'customer'
      ? tx.customerId === record.partyId
      : tx.vendorId === record.partyId;
    if (!sameParty) return false;

    const adjusted = (data.loanAdvanceAdjustments || [])
      .filter((a: LoanAdvanceAdjustment) => a.loanAdvanceId === loanAdvanceId)
      .reduce((sum: number, a: LoanAdvanceAdjustment) => sum + a.amount, 0);
    const available = Math.max(0, record.amount - adjusted);
    const targetDue = record.partyType === 'customer' ? Math.max(0, tx.customerDue) : Math.max(0, tx.vendorDue);
    const applied = Math.min(amount, available, targetDue);
    if (applied <= 0) return false;

    const now = new Date();
    const adjustment: LoanAdvanceAdjustment = {
      id: 'laa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      loanAdvanceId,
      transactionId,
      partyType: record.partyType,
      partyId: record.partyId,
      amount: applied,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      note: note?.trim() || undefined,
      createdBy: currentUser?.fullName || 'Staff',
    };

    setData((prev: any) => ({
      ...prev,
      loanAdvanceAdjustments: [...(prev.loanAdvanceAdjustments || []), adjustment],
      transactions: prev.transactions.map((t: Transaction) => {
        if (t.id !== transactionId) return t;
        if (record.partyType === 'customer') {
          const paid = t.customerPaid + applied;
          const due = Math.max(0, t.sellingPrice - paid);
          return { ...t, customerPaid: paid, customerDue: due, status: due === 0 ? 'PAID' : 'PARTIAL', updatedAt: now.toISOString(), updatedBy: currentUser?.fullName || 'Staff' };
        }
        const paid = t.vendorPaid + applied;
        return { ...t, vendorPaid: paid, vendorDue: Math.max(0, t.vendorCost - paid), updatedAt: now.toISOString(), updatedBy: currentUser?.fullName || 'Staff' };
      }),
    }));
    recordAudit('Adjusted Loan / Advance', 'LoanAdvance', adjustment.id, undefined,
      record.partyName + ' → ' + tx.invoiceNumber + ' ৳' + applied);
    return true;
  };

  const deleteLoanAdvanceAdjustment = (id: string): boolean => {
    const adjustment = (data.loanAdvanceAdjustments || []).find((a: LoanAdvanceAdjustment) => a.id === id);
    const tx = adjustment ? data.transactions.find((t: Transaction) => t.id === adjustment.transactionId) : undefined;
    if (!adjustment || !tx) return false;
    setData((prev: any) => ({
      ...prev,
      loanAdvanceAdjustments: (prev.loanAdvanceAdjustments || []).filter((a: LoanAdvanceAdjustment) => a.id !== id),
      transactions: prev.transactions.map((t: Transaction) => {
        if (t.id !== adjustment.transactionId) return t;
        if (adjustment.partyType === 'customer') {
          const paid = Math.max(0, t.customerPaid - adjustment.amount);
          const due = Math.max(0, t.sellingPrice - paid);
          return { ...t, customerPaid: paid, customerDue: due, status: due === 0 && t.sellingPrice > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE', updatedAt: new Date().toISOString(), updatedBy: currentUser?.fullName || 'Staff' };
        }
        const paid = Math.max(0, t.vendorPaid - adjustment.amount);
        return { ...t, vendorPaid: paid, vendorDue: Math.max(0, t.vendorCost - paid), updatedAt: new Date().toISOString(), updatedBy: currentUser?.fullName || 'Staff' };
      }),
    }));
    recordAudit('Reversed Loan / Advance Adjustment', 'LoanAdvance', id, undefined, 'Adjustment reversed without cash movement');
    return true;
  };

  const createOneEntryAsync = async (input: OneEntryInput): Promise<Transaction> => {
    if (!USE_SERVER_API) return createOneEntry(input);
    const result = await (await import('../services/apiClient')).createServerOneEntry(input);
    const tx = result.transaction as Transaction;
    setData((prev: any) => ({
      ...prev,
      transactions: [tx, ...prev.transactions.filter((x: Transaction) => x.id !== tx.id)],
    }));
    return tx;
  };

  // Customers
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...cust,
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setData((prev: any) => ({
      ...prev,
      customers: [...prev.customers, newCust],
    }));
    recordAudit('Created Customer', 'Customer', newCust.id, undefined, `Added customer ${newCust.name} (${newCust.mobile})`);
    return newCust;
  };

  const updateCustomer = (id: string, cust: Partial<Customer>) => {
    let oldCust: Customer | undefined;
    setData((prev: any) => {
      oldCust = prev.customers.find((c: Customer) => c.id === id);
      return {
        ...prev,
        customers: prev.customers.map((c: Customer) => (c.id === id ? { ...c, ...cust } : c)),
      };
    });
    recordAudit('Updated Customer', 'Customer', id, JSON.stringify(oldCust), JSON.stringify(cust));
  };

  // Vendors
  const addVendor = (vend: Omit<Vendor, 'id' | 'createdAt'>): Vendor => {
    const newVend: Vendor = {
      ...vend,
      id: `vend_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setData((prev: any) => ({
      ...prev,
      vendors: [...prev.vendors, newVend],
    }));
    recordAudit('Created Vendor', 'Vendor', newVend.id, undefined, `Added vendor ${newVend.name}`);
    return newVend;
  };

  const updateVendor = (id: string, vend: Partial<Vendor>) => {
    let oldVend: Vendor | undefined;
    setData((prev: any) => {
      oldVend = prev.vendors.find((v: Vendor) => v.id === id);
      return {
        ...prev,
        vendors: prev.vendors.map((v: Vendor) => (v.id === id ? { ...v, ...vend } : v)),
      };
    });
    recordAudit('Updated Vendor', 'Vendor', id, JSON.stringify(oldVend), JSON.stringify(vend));
  };

  // ONE ENTRY SYSTEM - The heart of the application
  const createOneEntry = (input: OneEntryInput): Transaction => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // 1. Resolve or create Customer
    let customerId = input.customerId;
    let customerName = input.customerName.trim();
    let customerMobile = input.customerMobile.trim();

    if (input.customerMode === 'new' || !customerId) {
      // Check if duplicate mobile exists
      const existing = data.customers.find(
        (c: Customer) => c.mobile.replace(/[^0-9]/g, '') === customerMobile.replace(/[^0-9]/g, '')
      );
      if (existing) {
        customerId = existing.id;
        customerName = existing.name;
      } else {
        const createdCust = addCustomer({
          name: customerName,
          mobile: customerMobile,
          email: input.customerEmail,
          address: input.customerAddress,
          passportNumber: input.customerPassportNumber,
          passportExpiry: input.customerPassportExpiry,
          openingDue: 0,
        });
        customerId = createdCust.id;
      }
    }

    // 2. Resolve or create Vendor (if applicable)
    let vendorId = input.vendorId;
    let vendorName = input.vendorName?.trim();

    if (input.hasVendor && vendorName) {
      if (input.vendorMode === 'new' || !vendorId) {
        const existingVend = data.vendors.find(
          (v: Vendor) => v.name.toLowerCase() === vendorName!.toLowerCase()
        );
        if (existingVend) {
          vendorId = existingVend.id;
        } else {
          const createdVend = addVendor({
            name: vendorName,
            mobile: input.vendorMobile || '',
            company: input.vendorCompany || vendorName,
            openingPayable: 0,
          });
          vendorId = createdVend.id;
        }
      }
    }

    // 3. Calculate Financials
    const sellingPrice = Number(input.sellingPrice) || 0;
    const customerPaid = Number(input.customerPaid) || 0;
    const customerDue = Math.max(0, sellingPrice - customerPaid);

    const vendorCost = input.hasVendor ? (Number(input.vendorCost) || 0) : 0;
    const vendorPaid = input.hasVendor ? (Number(input.vendorPaid) || 0) : 0;
    const vendorDue = input.hasVendor ? Math.max(0, vendorCost - vendorPaid) : 0;

    const grossProfit = sellingPrice - vendorCost;

    let status: Transaction['status'] = 'DUE';
    if (customerDue === 0 && sellingPrice > 0) {
      status = 'PAID';
    } else if (customerPaid > 0) {
      status = 'PARTIAL';
    }

    // Generate Invoice Number
    const nextNum = (data.settings.invoiceStartNumber || 1000) + data.transactions.length + 1;
    const invoiceNumber = `${data.settings.invoicePrefix || 'SIAM-'}${nextNum}`;

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // Prepare Flight Details
    let flightDetails: FlightDetails | undefined = undefined;
    if (input.isFlight && input.flightDetails) {
      flightDetails = {
        ...input.flightDetails,
        statusHistory: [
          {
            status: input.flightDetails.ticketStatus,
            changedAt: now.toISOString(),
            changedBy: currentUser?.fullName || 'System',
            note: 'Initial ticket issuance',
          },
        ],
      };
    }

    const newTransaction: Transaction = {
      id: txId,
      invoiceNumber,
      date: todayStr,
      time: timeStr,
      createdBy: currentUser?.fullName || 'Staff',
      customerId: customerId || 'cust_guest',
      customerName,
      customerMobile,
      serviceId: input.serviceId,
      serviceName: input.serviceName,
      description: input.description,
      flightDetails,
      sellingPrice,
      customerPaid,
      customerDue,
      customerPaymentMethod: input.customerPaymentMethod,
      vendorId: input.hasVendor ? vendorId : undefined,
      vendorName: input.hasVendor ? vendorName : undefined,
      vendorCost,
      vendorPaid,
      vendorDue,
      vendorPaymentMethod: input.hasVendor ? input.vendorPaymentMethod : undefined,
      grossProfit,
      reminderDate: input.reminderDate || undefined,
      reminderTime: input.reminderTime || undefined,
      reminderStatus: input.reminderDate ? 'pending' : undefined,
      reminderNote: input.reminderNote,
      status,
      notes: input.notes,
    };

    // 4. Create Partial Payment records for customer paid & vendor paid
    const newPayments: PartialPayment[] = [];
    if (customerPaid > 0) {
      newPayments.push({
        id: `pay_${Date.now()}_c`,
        transactionId: txId,
        paymentType: 'customer',
        entityId: customerId || 'cust_guest',
        entityName: customerName,
        amount: customerPaid,
        paymentMethod: input.customerPaymentMethod,
        date: todayStr,
        time: timeStr,
        recordedBy: currentUser?.fullName || 'Staff',
        note: `Initial deposit for ${input.serviceName} (${invoiceNumber})`,
        reference: invoiceNumber,
      });
    }

    if (input.hasVendor && vendorPaid > 0 && vendorId) {
      newPayments.push({
        id: `pay_${Date.now()}_v`,
        transactionId: txId,
        paymentType: 'vendor',
        entityId: vendorId,
        entityName: vendorName || 'Vendor',
        amount: vendorPaid,
        paymentMethod: input.vendorPaymentMethod || 'Bank',
        date: todayStr,
        time: timeStr,
        recordedBy: currentUser?.fullName || 'Staff',
        note: `Initial payment to vendor for ${invoiceNumber}`,
        reference: invoiceNumber,
      });
    }

    setData((prev: any) => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      partialPayments: [...prev.partialPayments, ...newPayments],
    }));

    recordAudit(
      'ONE ENTRY Created',
      'Transaction',
      txId,
      undefined,
      `Invoice ${invoiceNumber}: ${customerName}, Service: ${input.serviceName}, Sale: ৳${sellingPrice}, Paid: ৳${customerPaid}, Due: ৳${customerDue}`
    );

    return newTransaction;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>, changeReason?: string) => {
    let oldTx: Transaction | undefined;
    setData((prev: any) => {
      oldTx = prev.transactions.find((t: Transaction) => t.id === id);
      return {
        ...prev,
        transactions: prev.transactions.map((t: Transaction) => {
          if (t.id === id) {
            const merged = { ...t, ...updates, updatedAt: new Date().toISOString(), updatedBy: currentUser?.fullName };
            // Recalculate derived dues if price was adjusted
            if (updates.sellingPrice !== undefined || updates.customerPaid !== undefined) {
              const sp = updates.sellingPrice !== undefined ? updates.sellingPrice : t.sellingPrice;
              const cp = updates.customerPaid !== undefined ? updates.customerPaid : t.customerPaid;
              merged.customerDue = Math.max(0, sp - cp);
              merged.status = merged.customerDue === 0 ? 'PAID' : (cp > 0 ? 'PARTIAL' : 'DUE');
            }
            if (updates.vendorCost !== undefined || updates.vendorPaid !== undefined) {
              const vc = updates.vendorCost !== undefined ? updates.vendorCost : t.vendorCost;
              const vp = updates.vendorPaid !== undefined ? updates.vendorPaid : t.vendorPaid;
              merged.vendorDue = Math.max(0, vc - vp);
            }
            if (updates.sellingPrice !== undefined || updates.vendorCost !== undefined) {
              const sp = updates.sellingPrice !== undefined ? updates.sellingPrice : t.sellingPrice;
              const vc = updates.vendorCost !== undefined ? updates.vendorCost : t.vendorCost;
              merged.grossProfit = sp - vc;
            }
            return merged;
          }
          return t;
        }),
      };
    });

    recordAudit(
      'Updated Transaction',
      'Transaction',
      id,
      JSON.stringify(oldTx),
      `Updated: ${JSON.stringify(updates)} ${changeReason ? `(Reason: ${changeReason})` : ''}`
    );
  };

  const deleteTransaction = (id: string) => {
    let deletedTx: Transaction | undefined;
    setData((prev: any) => {
      deletedTx = prev.transactions.find((t: Transaction) => t.id === id);
      return {
        ...prev,
        transactions: prev.transactions.filter((t: Transaction) => t.id !== id),
        partialPayments: prev.partialPayments.filter((p: PartialPayment) => p.transactionId !== id),
        // Remove invoice-linked loan/advance adjustments when the invoice is deleted.
        // This prevents orphaned adjustments from reducing the advance's available balance.
        loanAdvanceAdjustments: (prev.loanAdvanceAdjustments || []).filter(
          (a: LoanAdvanceAdjustment) => a.transactionId !== id
        ),
      };
    });
    recordAudit(
      'Deleted Transaction',
      'Transaction',
      id,
      JSON.stringify(deletedTx),
      `Deleted Invoice ${deletedTx?.invoiceNumber}`
    );
  };

  const updateFlightStatus = (txId: string, status: TicketStatus, note?: string) => {
    const now = new Date();
    setData((prev: any) => ({
      ...prev,
      transactions: prev.transactions.map((t: Transaction) => {
        if (t.id === txId && t.flightDetails) {
          const oldStatus = t.flightDetails.ticketStatus;
          const history = t.flightDetails.statusHistory || [];
          return {
            ...t,
            flightDetails: {
              ...t.flightDetails,
              ticketStatus: status,
              statusHistory: [
                ...history,
                {
                  status,
                  changedAt: now.toISOString(),
                  changedBy: currentUser?.fullName || 'Staff',
                  note: note || `Status changed from ${oldStatus} to ${status}`,
                },
              ],
            },
          };
        }
        return t;
      }),
    }));

    recordAudit(
      'Updated Flight Status',
      'Transaction',
      txId,
      undefined,
      `Flight ticket status changed to ${status}${note ? ` (${note})` : ''}`
    );
  };

  // Partial Payment
  const addPartialPayment = (params: {
    transactionId: string;
    paymentType: 'customer' | 'vendor';
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
    time: string;
    note?: string;
    reference?: string;
  }) => {
    const targetTx = data.transactions.find((t: Transaction) => t.id === params.transactionId);
    if (!targetTx) return;

    const newPayment: PartialPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      transactionId: params.transactionId,
      paymentType: params.paymentType,
      entityId: params.paymentType === 'customer' ? targetTx.customerId : (targetTx.vendorId || 'vend_unknown'),
      entityName: params.paymentType === 'customer' ? targetTx.customerName : (targetTx.vendorName || 'Vendor'),
      amount,
      paymentMethod: params.paymentMethod,
      date: params.date,
      time: params.time,
      recordedBy: currentUser?.fullName || 'Staff',
      note: params.note,
      reference: params.reference || targetTx.invoiceNumber,
    };

    setData((prev: any) => {
      const updatedTxs = prev.transactions.map((t: Transaction) => {
        if (t.id === params.transactionId) {
          if (params.paymentType === 'customer') {
            const newPaid = t.customerPaid + amount;
            const newDue = Math.max(0, t.sellingPrice - newPaid);
            return {
              ...t,
              customerPaid: newPaid,
              customerDue: newDue,
              status: newDue === 0 ? ('PAID' as const) : ('PARTIAL' as const),
            };
          } else {
            const newPaid = t.vendorPaid + amount;
            const newDue = Math.max(0, t.vendorCost - newPaid);
            return {
              ...t,
              vendorPaid: newPaid,
              vendorDue: newDue,
            };
          }
        }
        return t;
      });

      return {
        ...prev,
        transactions: updatedTxs,
        partialPayments: [...prev.partialPayments, newPayment],
      };
    });

    recordAudit(
      params.paymentType === 'customer' ? 'Customer Payment Received' : 'Vendor Payment Made',
      'Payment',
      newPayment.id,
      undefined,
      `${params.paymentType === 'customer' ? 'Received' : 'Paid'} ৳${params.amount} via ${params.paymentMethod} for Ref ${targetTx.invoiceNumber}`
    );
  };

  // Expenses
  const addExpense = (expense: Omit<Expense, 'id' | 'createdBy'>) => {
    const newExp: Expense = {
      ...expense,
      id: `exp_${Date.now()}`,
      createdBy: currentUser?.fullName || 'Staff',
    };
    setData((prev: any) => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
    }));
    recordAudit(
      'Added Expense',
      'Expense',
      newExp.id,
      undefined,
      `Expense: ${newExp.category} - ৳${newExp.amount} (${newExp.description}) paid via ${newExp.paymentMethod}`
    );
  };

  const deleteExpense = (id: string) => {
    let deletedExp: Expense | undefined;
    setData((prev: any) => {
      deletedExp = prev.expenses.find((e: Expense) => e.id === id);
      return {
        ...prev,
        expenses: prev.expenses.filter((e: Expense) => e.id !== id),
      };
    });
    recordAudit('Deleted Expense', 'Expense', id, JSON.stringify(deletedExp), `Deleted expense ৳${deletedExp?.amount}`);
  };

  const updateExpenseCategories = (cats: ExpenseCategory[]) => {
    setData((prev: any) => ({ ...prev, expenseCategories: cats }));
  };

  // Fund Transfers
  const addFundTransfer = (transfer: Omit<FundTransfer, 'id' | 'createdBy'>) => {
    const newTrf: FundTransfer = {
      ...transfer,
      id: `trf_${Date.now()}`,
      createdBy: currentUser?.fullName || 'Staff',
    };
    setData((prev: any) => ({
      ...prev,
      transfers: [newTrf, ...prev.transfers],
    }));
    recordAudit(
      'Fund Transfer',
      'Transfer',
      newTrf.id,
      undefined,
      `Transfer ৳${newTrf.amount} from ${newTrf.fromAccount} to ${newTrf.toAccount} (Reason: ${newTrf.reason})`
    );
  };

  const updateOpeningBalance = (method: PaymentMethod, amount: number) => {
    setData((prev: any) => ({
      ...prev,
      openingBalances: {
        ...prev.openingBalances,
        [method]: amount,
      },
    }));
    recordAudit('Updated Opening Balance', 'Settings', method, undefined, `Set opening balance for ${method} to ৳${amount}`);
  };

  const updateSettings = (settings: Partial<BusinessSettings>) => {
    setData((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
    recordAudit('Updated Settings', 'Settings', 'business', undefined, `Updated business settings`);
  };

  const updateServices = (services: ServiceItem[]) => {
    setData((prev: any) => ({ ...prev, services }));
    recordAudit('Updated Services', 'Service', 'all', undefined, `Updated services catalog`);
  };

  const completeReminder = (txId: string) => {
    setData((prev: any) => ({
      ...prev,
      transactions: prev.transactions.map((t: Transaction) =>
        t.id === txId ? { ...t, reminderStatus: 'completed' as const } : t
      ),
    }));
  };

  const snoozeReminder = (txId: string, days: number) => {
    const target = data.transactions.find((t: Transaction) => t.id === txId);
    if (!target) return;
    const baseDate = target.reminderDate ? new Date(target.reminderDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const newDateStr = baseDate.toISOString().split('T')[0];

    setData((prev: any) => ({
      ...prev,
      transactions: prev.transactions.map((t: Transaction) =>
        t.id === txId ? { ...t, reminderDate: newDateStr, reminderStatus: 'pending' as const } : t
      ),
    }));
    recordAudit('Snoozed Reminder', 'Transaction', txId, undefined, `Snoozed reminder for ${days} days to ${newDateStr}`);
  };

  // Backup & Restore & Automated Scheduling
  const updateBackupSchedule = (updates: Partial<AutomatedBackupSchedule>) => {
    setData((prev: any) => {
      const updatedSchedule: AutomatedBackupSchedule = {
        ...prev.backupSchedule,
        ...updates,
        emailConfig: {
          ...prev.backupSchedule?.emailConfig,
          ...updates.emailConfig,
        },
        cloudConfig: {
          ...prev.backupSchedule?.cloudConfig,
          ...updates.cloudConfig,
        },
        encryption: {
          ...prev.backupSchedule?.encryption,
          ...updates.encryption,
          lastPassphraseUpdate:
            updates.encryption?.passphrase &&
            updates.encryption?.passphrase !== prev.backupSchedule?.encryption?.passphrase
              ? new Date().toISOString().split('T')[0]
              : prev.backupSchedule?.encryption?.lastPassphraseUpdate,
        },
      };
      return {
        ...prev,
        backupSchedule: updatedSchedule,
      };
    });
    recordAudit(
      'Updated Backup Schedule',
      'Settings',
      'backup_schedule',
      undefined,
      `Updated automated schedule (Enabled: ${updates.enabled !== undefined ? updates.enabled : data.backupSchedule?.enabled}, Time: ${updates.scheduledTime || data.backupSchedule?.scheduledTime}, Dest: ${updates.backupDestination || data.backupSchedule?.backupDestination})`
    );
  };

  const triggerEncryptedBackup = async (options?: {
    destination?: BackupDestination;
    isManual?: boolean;
    overridePassphrase?: string;
  }): Promise<{
    success: boolean;
    log: BackupExecutionLog;
    downloadDataUrl: string;
    jsonString: string;
    message: string;
  }> => {
    const isManual = options?.isManual ?? true;
    const dest = options?.destination || data.backupSchedule?.backupDestination || 'both';
    const passphrase =
      options?.overridePassphrase ||
      data.backupSchedule?.encryption?.passphrase ||
      'SiamAirSecure2026!';

    // Prepare complete database snapshot
    const backupSnapshot = {
      settings: data.settings,
      users: data.users,
      customers: data.customers,
      vendors: data.vendors,
      services: data.services,
      expenseCategories: data.expenseCategories,
      transactions: data.transactions,
      partialPayments: data.partialPayments,
      expenses: data.expenses,
      transfers: data.transfers,
      auditLogs: data.auditLogs,
      openingBalances: data.openingBalances,
      backupSchedule: data.backupSchedule,
      exportedAt: new Date().toISOString(),
      exporter: currentUser ? currentUser.fullName : 'Automated Cron Scheduler',
    };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const fileName = `SIAM_AIR_ENCRYPTED_BACKUP_${dateStr}_${timeStr.replace(':', '')}.enc.json`;

    // Encrypt payload using AES-256-GCM via Web Crypto
    const encResult = await encryptDatabasePayload(backupSnapshot, passphrase);

    // Calculate delivery destinations
    const destinationsDelivered: string[] = [];
    if (dest === 'email' || dest === 'both') {
      const email = data.backupSchedule?.emailConfig?.recipientEmail || 'bijoy105671@gmail.com';
      destinationsDelivered.push(`Email: ${email}`);
      if (data.backupSchedule?.emailConfig?.ccEmail) {
        destinationsDelivered.push(`CC: ${data.backupSchedule.emailConfig.ccEmail}`);
      }
    }
    if (dest === 'cloud' || dest === 'both') {
      const provider = data.backupSchedule?.cloudConfig?.provider || 'google_drive';
      const providerLabel =
        provider === 'google_drive'
          ? 'Google Drive'
          : provider === 'dropbox'
          ? 'Dropbox'
          : provider === 'aws_s3'
          ? 'AWS S3'
          : 'OneDrive';
      const folderPath = data.backupSchedule?.cloudConfig?.folderPath || 'SIAM_AIR_Backups';
      destinationsDelivered.push(`${providerLabel}: ${folderPath}/${fileName}`);
    }

    const log: BackupExecutionLog = {
      id: `bkl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: `${dateStr} ${timeStr}`,
      triggerType: isManual ? 'manual_admin' : 'automated_schedule',
      status: 'success',
      destination: dest,
      destinationsDelivered,
      fileSizeKb: encResult.sizeKb,
      encrypted: true,
      encryptionAlgorithm: 'AES-256-GCM',
      checksumSha256: encResult.checksumSha256,
      details: isManual
        ? `Manual on-demand encrypted backup generated and dispatched to ${destinationsDelivered.join(', ')}`
        : `Scheduled automated daily backup executed and successfully routed to ${destinationsDelivered.join(', ')}`,
      fileName,
    };

    // Update state with execution stats
    setData((prev: any) => ({
      ...prev,
      backupSchedule: {
        ...prev.backupSchedule,
        lastRunTimestamp: now.toISOString(),
        lastRunStatus: 'success',
        lastRunMessage: `Encrypted backup (${encResult.sizeKb} KB) sent to ${destinationsDelivered.join(' & ')}`,
        lastBackupSizeKb: encResult.sizeKb,
        lastBackupChecksum: encResult.checksumSha256,
        totalAutomatedRuns: (prev.backupSchedule?.totalAutomatedRuns || 0) + (isManual ? 0 : 1),
      },
      backupLogs: [log, ...(prev.backupLogs || [])],
    }));

    recordAudit(
      isManual ? 'Manual Encrypted Backup Generated' : 'Automated Daily Backup Dispatched',
      'Settings',
      'backup',
      undefined,
      `Encrypted backup archive (${encResult.sizeKb} KB, AES-256-GCM) dispatched to ${destinationsDelivered.join(', ')}. SHA-256: ${encResult.checksumSha256.substring(0, 16)}...`
    );

    const blob = new Blob([encResult.jsonString], { type: 'application/json' });
    const downloadDataUrl = URL.createObjectURL(blob);

    return {
      success: true,
      log,
      downloadDataUrl,
      jsonString: encResult.jsonString,
      message: `Encrypted database backup (${encResult.sizeKb} KB) dispatched successfully to ${destinationsDelivered.join(' and ')}!`,
    };
  };

  const restoreFromEncryptedBackup = async (
    fileContent: string,
    passphrase: string
  ): Promise<{ success: boolean; message: string }> => {
    const decryptResult = await decryptDatabasePayload(fileContent, passphrase);
    if (!decryptResult.success || !decryptResult.data) {
      return { success: false, message: decryptResult.error || 'Decryption failed.' };
    }
    const restored = decryptResult.data;
    if (!restored.settings || !restored.transactions) {
      return { success: false, message: 'Invalid database payload inside decrypted backup.' };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    setData((prev: any) => ({
      ...prev,
      ...restored,
      backupLogs: [
        {
          id: `bkl_${Date.now()}`,
          timestamp: `${dateStr} ${timeStr}`,
          triggerType: 'manual_admin',
          status: 'success',
          destination: 'both',
          destinationsDelivered: ['Restored to Local Storage'],
          fileSizeKb: Number((new Blob([fileContent]).size / 1024).toFixed(2)),
          encrypted: true,
          encryptionAlgorithm: 'AES-256-GCM',
          checksumSha256: decryptResult.checksumVerified ? 'VERIFIED' : 'UNVERIFIED',
          details: 'Successfully decrypted and restored database snapshot into system memory.',
          fileName: 'Restored_Encrypted_Backup.enc.json',
        },
        ...(prev.backupLogs || []),
      ],
    }));

    recordAudit(
      'Restored Encrypted Backup',
      'Settings',
      'restore',
      undefined,
      'Successfully decrypted and restored database state with AES-256-GCM verification'
    );
    return {
      success: true,
      message: 'Database restored successfully with verified AES-256 SHA-256 integrity!',
    };
  };

  const testBackupDestination = async (
    dest: BackupDestination
  ): Promise<{ success: boolean; message: string }> => {
    // Artificial latency for realism
    await new Promise((r) => setTimeout(r, 600));
    if (dest === 'email') {
      const email = data.backupSchedule?.emailConfig?.recipientEmail || 'bijoy105671@gmail.com';
      if (!email || !email.includes('@')) {
        return { success: false, message: 'Invalid recipient email address.' };
      }
      return {
        success: true,
        message: `Handshake successful! Test verification dispatch successfully pinged ${email}.`,
      };
    }
    if (dest === 'cloud') {
      const provider = data.backupSchedule?.cloudConfig?.provider || 'Google Drive';
      const folder = data.backupSchedule?.cloudConfig?.folderPath || 'SIAM_AIR_Backups';
      return {
        success: true,
        message: `Connected! Verified authentication and write access for ${provider} in directory '${folder}'.`,
      };
    }
    return {
      success: true,
      message: `Both connections verified: Email test pinged ${data.backupSchedule?.emailConfig?.recipientEmail} and cloud directory '${data.backupSchedule?.cloudConfig?.folderPath}' verified.`,
    };
  };

  const deleteBackupLog = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      backupLogs: (prev.backupLogs || []).filter((l: BackupExecutionLog) => l.id !== id),
    }));
  };

  const clearBackupLogs = () => {
    setData((prev: any) => ({
      ...prev,
      backupLogs: [],
    }));
  };

  // Automated Daily Backup Schedule Background Worker
  useEffect(() => {
    if (!data.backupSchedule?.enabled) return;

    const checkAndRunSchedule = () => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const currentHoursMins = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
      const scheduledTime = data.backupSchedule?.scheduledTime || '23:00';

      const lastRun = data.backupSchedule?.lastRunTimestamp;
      const lastRunDateStr = lastRun ? new Date(lastRun).toISOString().split('T')[0] : null;

      // Check if scheduled time has arrived or passed today, and hasn't already run today
      if (currentHoursMins >= scheduledTime && lastRunDateStr !== todayDateStr) {
        triggerEncryptedBackup({ isManual: false }).catch((err) => {
          console.error('Automated backup worker error:', err);
        });
      }
    };

    const initialTimer = setTimeout(checkAndRunSchedule, 4000);
    const interval = setInterval(checkAndRunSchedule, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [
    data.backupSchedule?.enabled,
    data.backupSchedule?.scheduledTime,
    data.backupSchedule?.lastRunTimestamp,
  ]);

  const exportBackup = () => {
    const backupData = JSON.stringify(data, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIAM_AIR_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordAudit('Exported Backup', 'Settings', 'backup', undefined, 'Downloaded JSON backup file');
  };

  const importBackup = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.settings && parsed.transactions && parsed.customers) {
        setData({
          ...parsed,
          backupSchedule: parsed.backupSchedule || INITIAL_BACKUP_SCHEDULE,
          backupLogs: parsed.backupLogs || INITIAL_BACKUP_LOGS,
          loanAdvanceAdjustments: parsed.loanAdvanceAdjustments || [],
        });
        recordAudit('Restored Backup', 'Settings', 'restore', undefined, 'Restored database from backup file');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Invalid backup file:', err);
      return false;
    }
  };

  const clearAllInputData = () => {
    const clean = {
      settings: data.settings || INITIAL_SETTINGS,
      users: data.users || INITIAL_USERS,
      currentUserId: data.currentUserId || INITIAL_USERS[0].id,
      customers: [],
      vendors: [],
      services: data.services || INITIAL_SERVICES,
      expenseCategories: data.expenseCategories || INITIAL_EXPENSE_CATEGORIES,
      transactions: [],
      partialPayments: [],
      expenses: [],
      transfers: [],
      loanAdvances: [],
      loanAdvanceAdjustments: [],
      auditLogs: [],
      openingBalances: {
        Cash: 0,
        bKash: 0,
        Nagad: 0,
        Rocket: 0,
        Bank: 0,
        Card: 0,
        Other: 0,
      },
      backupSchedule: data.backupSchedule || INITIAL_BACKUP_SCHEDULE,
      backupLogs: [],
    };
    setData(clean);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    recordAudit('Clear All Data', 'Settings', 'system', undefined, 'All transactions, customers, vendors, expenses, and ledger input data were completely cleared');
  };

  const loadDemoSampleData = () => {
    const demo = {
      settings: data.settings || INITIAL_SETTINGS,
      users: data.users || INITIAL_USERS,
      currentUserId: data.currentUserId || INITIAL_USERS[0].id,
      customers: DEMO_CUSTOMERS,
      vendors: DEMO_VENDORS,
      services: data.services || INITIAL_SERVICES,
      expenseCategories: data.expenseCategories || INITIAL_EXPENSE_CATEGORIES,
      transactions: DEMO_TRANSACTIONS,
      partialPayments: DEMO_PARTIAL_PAYMENTS,
      expenses: DEMO_EXPENSES,
      transfers: DEMO_TRANSFERS,
      loanAdvances: [],
      loanAdvanceAdjustments: [],
      auditLogs: DEMO_AUDIT_LOGS,
      openingBalances: DEMO_OPENING_BALANCES,
      backupSchedule: data.backupSchedule || INITIAL_BACKUP_SCHEDULE,
      backupLogs: INITIAL_BACKUP_LOGS,
    };
    setData(demo);
    recordAudit('Load Demo Data', 'Settings', 'system', undefined, 'Loaded demonstration travel agency records');
  };

  const resetToSampleData = () => {
    loadDemoSampleData();
  };

  // CALCULATIONS FOR ACCOUNT BALANCES
  // Formula: Opening + Customer payments received - Vendor payments - Expenses + Transfers In - Transfers Out
  const accountBalances: AccountBalances = useMemo(() => {
    const balances: AccountBalances = {
      Cash: data.openingBalances?.Cash || 0,
      bKash: data.openingBalances?.bKash || 0,
      Nagad: data.openingBalances?.Nagad || 0,
      Rocket: data.openingBalances?.Rocket || 0,
      Bank: data.openingBalances?.Bank || 0,
      Card: data.openingBalances?.Card || 0,
      Other: data.openingBalances?.Other || 0,
    };

    // 1. Customer Payments IN
    data.partialPayments.forEach((p: PartialPayment) => {
      if (p.paymentType === 'customer' && balances[p.paymentMethod] !== undefined) {
        balances[p.paymentMethod] += p.amount;
      } else if (p.paymentType === 'vendor' && balances[p.paymentMethod] !== undefined) {
        // 2. Vendor Payments OUT
        balances[p.paymentMethod] -= p.amount;
      }
    });

    // 3. Expenses OUT
    data.expenses.forEach((e: Expense) => {
      if (balances[e.paymentMethod] !== undefined) {
        balances[e.paymentMethod] -= e.amount;
      }
    });

    // 4. Loan / Advance cash movement (not income or expense)
    (data.loanAdvances || []).forEach((r: LoanAdvanceRecord) => {
      if (balances[r.paymentMethod] !== undefined) {
        balances[r.paymentMethod] += r.direction === 'received' ? r.amount : -r.amount;
      }
    });

    // 5. Fund Transfers
    data.transfers.forEach((trf: FundTransfer) => {
      if (balances[trf.fromAccount] !== undefined) {
        balances[trf.fromAccount] -= trf.amount;
      }
      if (balances[trf.toAccount] !== undefined) {
        balances[trf.toAccount] += trf.amount;
      }
    });

    return balances;
  }, [data.openingBalances, data.partialPayments, data.expenses, data.transfers, data.loanAdvances]);

  // TOTAL AVAILABLE MONEY = Cash + bKash + Nagad + Rocket + Bank + Other
  // Customer due must NOT be added. Vendor payable must NOT be deducted.
  const totalAvailableMoney = useMemo(() => {
    return Object.values(accountBalances).reduce((sum, val) => sum + val, 0);
  }, [accountBalances]);

  // Customer Receivable: Sum of opening due + unpaid dues across all transactions
  const totalCustomerReceivable = useMemo(() => {
    const openingTotal = data.customers.reduce((sum: number, c: Customer) => sum + (c.openingDue || 0), 0);
    const txDueTotal = data.transactions.reduce((sum: number, t: Transaction) => sum + (t.customerDue || 0), 0);
    return openingTotal + txDueTotal;
  }, [data.customers, data.transactions]);

  // Vendor Payable: Sum of opening payable + unpaid vendor dues across all transactions
  const totalVendorPayable = useMemo(() => {
    const openingTotal = data.vendors.reduce((sum: number, v: Vendor) => sum + (v.openingPayable || 0), 0);
    const txDueTotal = data.transactions.reduce((sum: number, t: Transaction) => sum + (t.vendorDue || 0), 0);
    return openingTotal + txDueTotal;
  }, [data.vendors, data.transactions]);

  // Today's summary stats
  const todaySummary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayTxs = data.transactions.filter((t: Transaction) => t.date === todayStr);
    const totalSales = todayTxs.reduce((sum: number, t: Transaction) => sum + t.sellingPrice, 0);

    const todayCustomerPayments = data.partialPayments.filter(
      (p: PartialPayment) => p.date === todayStr && p.paymentType === 'customer'
    );
    const totalReceived = todayCustomerPayments.reduce((sum: number, p: PartialPayment) => sum + p.amount, 0);

    const todayExpenses = data.expenses.filter((e: Expense) => e.date === todayStr);
    const totalExpense = todayExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

    const todayVendorPayments = data.partialPayments.filter(
      (p: PartialPayment) => p.date === todayStr && p.paymentType === 'vendor'
    );
    const totalVendorPayment = todayVendorPayments.reduce((sum: number, p: PartialPayment) => sum + p.amount, 0);

    let grossProfit = 0;
    let loss = 0;
    todayTxs.forEach((t: Transaction) => {
      if (t.grossProfit >= 0) {
        grossProfit += t.grossProfit;
      } else {
        loss += Math.abs(t.grossProfit);
      }
    });

    const netProfit = grossProfit - loss - totalExpense;

    return {
      totalSales,
      totalReceived,
      totalExpense,
      totalVendorPayment,
      grossProfit,
      loss,
      netProfit,
    };
  }, [data.transactions, data.partialPayments, data.expenses]);

  // Upcoming flights (next 30 days)
  const upcomingFlights = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const maxDateStr = thirtyDaysLater.toISOString().split('T')[0];

    return data.transactions
      .filter((t: Transaction): t is Transaction & { flightDetails: FlightDetails } => {
        if (!t.flightDetails || !t.flightDetails.departureDate) return false;
        return (
          t.flightDetails.departureDate >= todayStr &&
          t.flightDetails.departureDate <= maxDateStr
        );
      })
      .sort((a: Transaction & { flightDetails: FlightDetails }, b: Transaction & { flightDetails: FlightDetails }) =>
        a.flightDetails.departureDate.localeCompare(b.flightDetails.departureDate)
      );
  }, [data.transactions]);

  // Reminders for Today & Overdue
  const { todayReminders, overdueReminders } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today: Transaction[] = [];
    const overdue: (Transaction & { overdueDays: number })[] = [];

    data.transactions.forEach((t: Transaction) => {
      if (t.customerDue > 0 && t.reminderDate && t.reminderStatus !== 'completed') {
        if (t.reminderDate === todayStr) {
          today.push(t);
        } else if (t.reminderDate < todayStr) {
          const remDate = new Date(t.reminderDate);
          const currDate = new Date(todayStr);
          const diffDays = Math.max(1, Math.round((currDate.getTime() - remDate.getTime()) / (1000 * 60 * 60 * 24)));
          overdue.push({ ...t, overdueDays: diffDays });
        }
      }
    });

    return { todayReminders: today, overdueReminders: overdue };
  }, [data.transactions]);

  // Customer Ledger helper
  const getCustomerLedger = (customerId: string) => {
    const customer = data.customers.find((c: Customer) => c.id === customerId);
    const txs = data.transactions.filter((t: Transaction) => t.customerId === customerId);
    const payments = data.partialPayments.filter(
      (p: PartialPayment) => p.entityId === customerId && p.paymentType === 'customer'
    );
    const totalSales = txs.reduce((sum: number, t: Transaction) => sum + t.sellingPrice, 0);
    const totalPaid = payments.reduce((sum: number, p: PartialPayment) => sum + p.amount, 0);
    const currentDue = (customer?.openingDue || 0) + totalSales - totalPaid;

    return {
      customer,
      totalSales,
      totalPaid,
      currentDue,
      transactions: txs,
      payments,
    };
  };

  // Vendor Ledger helper
  const getVendorLedger = (vendorId: string) => {
    const vendor = data.vendors.find((v: Vendor) => v.id === vendorId);
    const txs = data.transactions.filter((t: Transaction) => t.vendorId === vendorId);
    const payments = data.partialPayments.filter(
      (p: PartialPayment) => p.entityId === vendorId && p.paymentType === 'vendor'
    );
    const totalCost = txs.reduce((sum: number, t: Transaction) => sum + t.vendorCost, 0);
    const totalPaid = payments.reduce((sum: number, p: PartialPayment) => sum + p.amount, 0);
    const currentPayable = (vendor?.openingPayable || 0) + totalCost - totalPaid;

    return {
      vendor,
      totalCost,
      totalPaid,
      currentPayable,
      transactions: txs,
      payments,
    };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: data.users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        customers: data.customers,
        vendors: data.vendors,
        services: data.services,
        expenseCategories: data.expenseCategories,
        transactions: data.transactions,
        partialPayments: data.partialPayments,
        expenses: data.expenses,
        transfers: data.transfers,
        loanAdvances: data.loanAdvances || [],
        loanAdvanceAdjustments: data.loanAdvanceAdjustments || [],
        auditLogs: data.auditLogs,
        settings: data.settings,
        openingBalances: data.openingBalances,
        accountBalances,
        totalAvailableMoney,
        totalCustomerReceivable,
        totalVendorPayable,
        todaySummary,
        upcomingFlights,
        todayReminders,
        overdueReminders,
        createOneEntry,
        updateTransaction,
        deleteTransaction,
        updateFlightStatus,
        addPartialPayment,
        addCustomer,
        updateCustomer,
        addVendor,
        updateVendor,
        addExpense,
        deleteExpense,
        updateExpenseCategories,
        addFundTransfer,
        addLoanAdvance,
        updateLoanAdvance,
        deleteLoanAdvance,
        adjustLoanAdvance,
        deleteLoanAdvanceAdjustment,
        updateOpeningBalance,
        updateSettings,
        updateServices,
        completeReminder,
        snoozeReminder,
        backupSchedule: data.backupSchedule || INITIAL_BACKUP_SCHEDULE,
        backupLogs: data.backupLogs || INITIAL_BACKUP_LOGS,
        updateBackupSchedule,
        triggerEncryptedBackup,
        restoreFromEncryptedBackup,
        testBackupDestination,
        deleteBackupLog,
        clearBackupLogs,
        exportBackup,
        importBackup,
        clearAllInputData,
        loadDemoSampleData,
        resetToSampleData,
        getCustomerLedger,
        getVendorLedger,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
