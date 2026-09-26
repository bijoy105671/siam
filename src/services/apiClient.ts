export type ApiError = { error?: string; [key: string]: unknown };

export const USE_SERVER_API = import.meta.env.VITE_USE_SERVER_API === 'true';

const SECURITY_VERIFIED_STORAGE_KEY = 'siam_security_otp_verified_at';
const SECURITY_REQUIRED_STORAGE_KEY = 'siam_security_otp_required';

const waitForSecurityVerification = (message: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Security OTP verification requires a browser.'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('siam:security-otp-verified', onVerified);
      window.removeEventListener('siam:security-otp-cancelled', onCancelled);
      window.removeEventListener('storage', onStorage);
      if (ok) resolve();
      else reject(new Error(error || 'Security OTP verification cancelled.'));
    };
    const onVerified = () => finish(true);
    const onCancelled = (event: Event) => finish(false, (event as CustomEvent).detail?.message);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SECURITY_VERIFIED_STORAGE_KEY && event.newValue) finish(true);
    };
    window.addEventListener('siam:security-otp-verified', onVerified);
    window.addEventListener('siam:security-otp-cancelled', onCancelled);
    window.addEventListener('storage', onStorage);
    try {
      const lastVerified = Number(localStorage.getItem(SECURITY_VERIFIED_STORAGE_KEY) || 0);
      if (lastVerified && Date.now() - lastVerified < 10 * 60 * 1000) {
        finish(true);
        return;
      }
    } catch {}
    try { localStorage.setItem(SECURITY_REQUIRED_STORAGE_KEY, JSON.stringify({ message, requestedAt: Date.now() })); } catch {}
    window.dispatchEvent(new CustomEvent('siam:security-otp-required', { detail: { message } }));
  });
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const request = async (retry = false): Promise<T> => {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const payload = (await response.json().catch(() => ({}))) as T & ApiError & { message?: string };
    if (response.status === 428 && payload?.error === 'SECURITY_OTP_REQUIRED' && !retry) {
      await waitForSecurityVerification(payload.message || 'A security OTP was sent to your recovery email.');
      return request(true);
    }
    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed (${response.status})`);
      Object.assign(error, payload);
      throw error;
    }
    return payload;
  };
  return request(false);
}

export const api = {
  health: () => apiRequest<{ ok: boolean }>('/api/health'),
  me: () => apiRequest<{ user: unknown }>('/api/auth/me'),
  login: (username: string, password: string) =>
    apiRequest<{ user: unknown }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  requestPasswordReset: (username: string) =>
    apiRequest<{ ok: boolean; message?: string }>('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  verifyPasswordReset: (username: string, otp: string, newPassword: string) =>
    apiRequest<{ ok: boolean; message?: string }>('/api/auth/verify-password-reset', {
      method: 'POST',
      body: JSON.stringify({ username, otp, newPassword }),
    }),
  settings: () => apiRequest<{ settings: Record<string, any> }>('/api/settings'),
  updateSettings: (settings: Record<string, any>) =>
    apiRequest<{ settings: Record<string, any> }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  dashboard: () => apiRequest<Record<string, unknown>>('/api/dashboard'),
  customers: (q = '') =>
    apiRequest<unknown[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  vendors: (q = '') =>
    apiRequest<unknown[]>(`/api/vendors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  updateCustomer: (id: string, input: Record<string, any>) => apiRequest<{ customer: unknown }>(`/api/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteCustomer: (id: string) => apiRequest<{ ok: boolean }>(`/api/customers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateVendor: (id: string, input: Record<string, any>) => apiRequest<{ vendor: unknown }>(`/api/vendors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteVendor: (id: string) => apiRequest<{ ok: boolean }>(`/api/vendors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  transactions: (limit = 100) =>
    apiRequest<unknown[]>(`/api/transactions?limit=${limit}`),
  recycleBin: () => apiRequest<unknown[]>('/api/admin/recycle-bin'),
  restoreTransaction: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/admin/recycle-bin/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  clearAllData: (backupCode: string) => apiRequest<{ ok: boolean; message: string }>('/api/admin/clear-all-data', { method: 'POST', body: JSON.stringify({ backupCode }) }),
  deleteTransaction: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reversePayment: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/payments/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  reverseExpense: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/expenses/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  reverseFundTransfer: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/fund-transfers/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  accountBalances: () =>
    apiRequest<{ balances: Record<string, number>; total: number }>('/api/accounts/balances'),
  openingBalances: () =>
    apiRequest<unknown[]>('/api/opening-balances'),
  customerLedger: (id: string) =>
    apiRequest<Record<string, any>>(`/api/customers/${encodeURIComponent(id)}/ledger`),
  vendorLedger: (id: string) =>
    apiRequest<Record<string, any>>(`/api/vendors/${encodeURIComponent(id)}/ledger`),
  recordPayment: (input: { transactionId: string; paymentType: 'customer' | 'vendor'; amount: number; paymentMethod: string; note?: string; reference?: string; paidAt?: string }) =>
    apiRequest<{ ok: boolean }>('/api/transactions/' + encodeURIComponent(input.transactionId) + '/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  createExpense: (input: Record<string, any>) =>
    apiRequest<{ expense: unknown }>('/api/expenses', { method: 'POST', body: JSON.stringify(input) }),
  createFundTransfer: (input: Record<string, any>) =>
    apiRequest<{ transfer: unknown }>('/api/fund-transfers', { method: 'POST', body: JSON.stringify(input) }),
  users: () => apiRequest<unknown[]>('/api/users'),
  createUser: (input: Record<string, any>) => apiRequest<{ user: unknown }>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUserServer: (id: string, input: Record<string, any>) => apiRequest<{ user: unknown }>(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deactivateUser: (id: string) => apiRequest<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  services: () => apiRequest<unknown[]>('/api/services'),
  createService: (input: Record<string, any>) => apiRequest<{ service: unknown }>('/api/services', { method: 'POST', body: JSON.stringify(input) }),
  updateService: (id: string, input: Record<string, any>) => apiRequest<{ service: unknown }>(`/api/services/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  disableService: (id: string) => apiRequest<{ ok: boolean }>(`/api/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateTransaction: (id: string, input: Record<string, any>) =>
    apiRequest<{ ok: boolean }>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  expenseCategories: () => apiRequest<unknown[]>('/api/expense-categories'),
  updateExpenseCategories: (categories: unknown[]) =>
    apiRequest<{ categories: unknown[] }>('/api/expense-categories', { method: 'PUT', body: JSON.stringify({ categories }) }),
  updateOpeningBalance: (account: string, amount: number) =>
    apiRequest<{ account: string; amount: number }>('/api/opening-balances/' + encodeURIComponent(account), {
      method: 'PUT', body: JSON.stringify({ amount }),
    }),
};


export type ServerTransaction = Record<string, any>;

function mapServerTransaction(tx: ServerTransaction): ServerTransaction {
  return {
    ...tx,
    customerName: tx.customer_name ?? tx.customerName ?? '',
    customerMobile: tx.customer_mobile ?? tx.customerMobile ?? '',
    vendorName: tx.vendor_name ?? tx.vendorName ?? undefined,
    serviceName: tx.service_name ?? tx.serviceName ?? '',
    date: tx.date,
    time: tx.time,
    status: tx.status,
    notes: tx.notes,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
    invoiceNumber: tx.invoice_number,
    createdBy: tx.created_by,
    customerId: tx.customer_id,
    serviceId: tx.service_id,
    flightDetails: tx.flight_details
      ? (typeof tx.flight_details === 'string' ? JSON.parse(tx.flight_details) : tx.flight_details)
      : undefined,
    sellingPrice: Number(tx.selling_price || 0),
    customerPaid: Number(tx.customer_paid || 0),
    customerDue: Number(tx.customer_due || 0),
    vendorId: tx.vendor_id,
    vendorCost: Number(tx.vendor_cost || 0),
    vendorPaid: Number(tx.vendor_paid || 0),
    vendorDue: Number(tx.vendor_due || 0),
    grossProfit: Number(tx.gross_profit || 0),
    reminderDate: tx.reminder_date,
    reminderTime: tx.reminder_time,
    reminderStatus: tx.reminder_status,
    reminderNote: tx.reminder_note,
  };
}

export const createServerOneEntry = async (input: Record<string, any>) => {
  const payload = {
    customer: {
      name: input.customerName,
      mobile: input.customerMobile,
      email: input.customerEmail || null,
      address: input.customerAddress || null,
      passportNumber: input.customerPassportNumber || null,
      passportExpiry: input.customerPassportExpiry || null,
    },
    service: { name: input.serviceName },
    serviceName: input.serviceName,
    description: input.description || null,
    flightDetails: input.flightDetails || null,
    sellingPrice: input.sellingPrice,
    customerPaid: input.customerPaid,
    customerPaymentMethod: String(input.customerPaymentMethod || 'Cash').toLowerCase(),
    vendor: input.hasVendor ? {
      name: input.vendorName || '',
      mobile: input.vendorMobile || '',
      company: input.vendorCompany || '',
    } : null,
    vendorName: input.hasVendor ? (input.vendorName || '') : '',
    vendorCost: input.vendorCost,
    vendorPaid: input.vendorPaid,
    vendorPaymentMethod: String(input.vendorPaymentMethod || 'Cash').toLowerCase(),
    reminderDate: input.reminderDate || null,
    reminderTime: input.reminderTime || null,
    reminderStatus: input.reminderDate ? 'pending' : null,
    reminderNote: input.reminderNote || null,
    notes: input.notes || null,
  };
  const result = await apiRequest<{ transaction: ServerTransaction; invoiceNumber: string }>(
    '/api/entries',
    { method: 'POST', body: JSON.stringify(payload) }
  );
  return { ...result, transaction: mapServerTransaction(result.transaction) };
};