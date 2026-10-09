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

export const flightDirectory = async (flightNo = '', from = '', to = '', airline = '') => {
  const params = new URLSearchParams();
  if (flightNo) params.set('flightNo', flightNo);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (airline) params.set('airline', airline);
  return apiRequest<any[]>(`/api/flight-directory?${params.toString()}`);
};

export const api = {
  flightDirectory: (flightNo = '', from = '', to = '', airline = '') =>
    apiRequest<unknown[]>(`/api/flight-directory?flightNo=${encodeURIComponent(flightNo)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&airline=${encodeURIComponent(airline)}`),
  saveFlightDirectory: (input: Record<string, any>) =>
    apiRequest<{ flight: unknown }>('/api/flight-directory', { method: 'POST', body: JSON.stringify(input) }),
  health: () => apiRequest<{ ok: boolean }>('/api/health'),
  saasPlans: () => apiRequest<{ plans: any[] }>('/api/saas/plans'),
  saasRegister: (input: Record<string, any>) => apiRequest<{ ok: boolean; status: string; message: string; userId: string }>('/api/saas/register', { method: 'POST', body: JSON.stringify(input) }),
  saasPaymentSettings: () => apiRequest<{ settings: any }>('/api/saas/payment-settings'),
  startSaasDemo: () => apiRequest<{ok:boolean;demo:boolean;message:string}>('/api/saas/demo', { method:'POST' }),
  activateSaasFreeTrial: (id: string) => apiRequest<{ok:boolean}>(`/api/admin/saas/free-trials/${encodeURIComponent(id)}/activate`, { method:'POST' }),
  adminSaas: () => apiRequest<any>('/api/admin/saas'),
  editSaasUser: (id: string, input: Record<string,any>) => apiRequest<{ok:boolean;user:any}>(`/api/admin/saas/users/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify(input) }),
  activateSaasUser: (id: string) => apiRequest<{ok:boolean;user:any;emailSent?:boolean}>(`/api/admin/saas/users/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify({isActive:true,resetFailedLogin:true,registrationStatus:'approved'}) }),
  deactivateSaasUser: (id: string) => apiRequest<{ok:boolean;user:any}>(`/api/admin/saas/users/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify({isActive:false}) }),
  deleteSaasUser: (id: string) => apiRequest<{ok:boolean}>(`/api/admin/saas/users/${encodeURIComponent(id)}`, { method:'DELETE' }),
  approveSaasPayment: (id: string) => apiRequest<{ok:boolean}>(`/api/admin/saas/payments/${encodeURIComponent(id)}/approve`, { method:'POST' }),
  rejectSaasPayment: (id: string, reason: string) => apiRequest<{ok:boolean}>(`/api/admin/saas/payments/${encodeURIComponent(id)}/reject`, { method:'POST', body: JSON.stringify({reason}) }),
  updateSaasPlan: (id: string, input: Record<string,any>) => apiRequest<{plan:any}>(`/api/admin/saas/plans/${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify(input) }),
  updateSaasPaymentSettings: (input: Record<string,any>) => apiRequest<{settings:any}>('/api/admin/saas/payment-settings', { method:'PATCH', body: JSON.stringify(input) }),
  verifyRegistrationOtp: (userId: string, otp: string) => apiRequest<{ ok: boolean; status: string; message: string }>('/api/saas/verify-registration', { method: 'POST', body: JSON.stringify({ userId, otp }) }),
  saasProfile: () => apiRequest<{ profile: any }>('/api/saas/profile'),
  updateSaasProfile: (input: Record<string, any>) => apiRequest<{ profile: any }>('/api/saas/profile', { method: 'PATCH', body: JSON.stringify(input) }),
  me: () => apiRequest<{ user: unknown }>('/api/auth/me'),
  login: (username: string, password: string) =>
    apiRequest<{ user?: unknown; requiresOtp?: boolean; challengeId?: string; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  resendLoginOtp: (challengeId: string) => apiRequest<{ok:boolean;resendCount:number;message:string}>('/api/auth/resend-login-otp', { method:'POST', body: JSON.stringify({ challengeId }) }),
  verifyLoginOtp: (challengeId: string, otp: string) =>
    apiRequest<{ user: unknown }>('/api/auth/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp }),
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
  publicSettings: () => apiRequest<{ settings: { name?: string; tagline?: string; logoUrl?: string; address?: string; mobile?: string; whatsapp?: string; email?: string; website?: string } }>('/api/public-settings'),
  settings: () => apiRequest<{ settings: Record<string, any> }>('/api/settings'),
  updateSettings: (settings: Record<string, any>) =>
    apiRequest<{ settings: Record<string, any> }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  customers: (q = '') =>
    apiRequest<unknown[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  vendors: (q = '') =>
    apiRequest<unknown[]>(`/api/vendors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createCustomer: (input: Record<string, any>) => apiRequest<{ customer: unknown }>('/api/customers', { method: 'POST', body: JSON.stringify(input) }),
  updateCustomer: (id: string, input: Record<string, any>) => apiRequest<{ customer: unknown }>(`/api/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteCustomer: (id: string) => apiRequest<{ ok: boolean }>(`/api/customers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createVendor: (input: Record<string, any>) => apiRequest<{ vendor: unknown }>('/api/vendors', { method: 'POST', body: JSON.stringify(input) }),
  updateVendor: (id: string, input: Record<string, any>) => apiRequest<{ vendor: unknown }>(`/api/vendors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteVendor: (id: string) => apiRequest<{ ok: boolean }>(`/api/vendors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  transactions: (limit = 100) =>
    apiRequest<unknown[]>(`/api/transactions?limit=${limit}`),
  paymentRecords: () =>
    apiRequest<unknown[]>('/api/payment-records'),
  appointments: () => apiRequest<unknown[]>('/api/appointments'),
  createAppointment: (input: Record<string, any>) => apiRequest<{ appointment: unknown }>('/api/appointments', { method: 'POST', body: JSON.stringify(input) }),
  updateAppointment: (id: string, input: Record<string, any>) => apiRequest<{ appointment: unknown }>('/api/appointments/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAppointment: (id: string) => apiRequest<{ ok: boolean }>('/api/appointments/' + encodeURIComponent(id), { method: 'DELETE' }),
  recycleBin: () => apiRequest<unknown[]>('/api/admin/recycle-bin'),
  restoreTransaction: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/admin/recycle-bin/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  clearAllData: (backupCode: string) => apiRequest<{ ok: boolean; message: string }>('/api/admin/clear-all-data', { method: 'POST', body: JSON.stringify({ backupCode }) }),
  deleteTransaction: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updatePayment: (id: string, input: { amount: number; paymentMethod: string; note?: string; reference?: string; paidAt?: string }) =>
    apiRequest<{ ok: boolean; payment: unknown }>(`/api/payments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  reversePayment: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/payments/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  reverseExpense: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/expenses/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  updateExpense: (id: string, input: Record<string, any>) =>
    apiRequest<{ expense: unknown }>(`/api/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  reverseFundTransfer: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/fund-transfers/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  accountBalances: () =>
    apiRequest<{ balances: Record<string, number>; total: number }>('/api/accounts/balances'),
  dashboard: () =>
    apiRequest<{ today: { total_sales: number; total_received: number; total_vendor_payment: number; total_expense: number; gross_profit: number; loss: number; net_profit: number } }>('/api/dashboard'),
  loanAdvances: () => apiRequest<unknown[]>('/api/loan-advances'),
  loanAdvanceAdjustments: () => apiRequest<unknown[]>('/api/loan-advances/adjustments'),
  createLoanAdvance: (input: Record<string, any>) =>
    apiRequest<{ loanAdvance: unknown }>('/api/loan-advances', { method: 'POST', body: JSON.stringify(input) }),
  updateLoanAdvance: (id: string, input: Record<string, any>) =>
    apiRequest<{ loanAdvance: unknown }>(`/api/loan-advances/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteLoanAdvance: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/loan-advances/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adjustLoanAdvance: (id: string, input: Record<string, any>) =>
    apiRequest<{ adjustment: unknown; transaction: unknown }>(`/api/loan-advances/${encodeURIComponent(id)}/adjust`, { method: 'POST', body: JSON.stringify(input) }),
  reverseLoanAdvanceAdjustment: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/loan-advance-adjustments/${encodeURIComponent(id)}/reverse`, { method: 'POST' }),
  storefrontOrders: () => apiRequest<unknown[]>('/api/storefront/orders'),
  updateStorefrontOrder: (id: string, status: string) =>
    apiRequest<{ order: unknown }>('/api/storefront/orders/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status }) }),
  openingBalances: () =>
    apiRequest<unknown[]>('/api/opening-balances'),
  customerLedger: (id: string) =>
    apiRequest<Record<string, any>>(`/api/customers/${encodeURIComponent(id)}/ledger`),
  vendorLedger: (id: string) =>
    apiRequest<Record<string, any>>(`/api/vendors/${encodeURIComponent(id)}/ledger`),
  recordOpeningBalancePayment: (input: { type: 'customer' | 'vendor'; id: string; amount: number; paymentMethod: string; note?: string; reference?: string; paidAt?: string }) =>
    apiRequest<{ ok: boolean; payment: unknown }>(`/api/ledger/${encodeURIComponent(input.type)}/${encodeURIComponent(input.id)}/payment`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  recordPayment: (input: { transactionId: string; entityId?: string; paymentType: 'customer' | 'vendor'; amount: number; paymentMethod: string; note?: string; reference?: string; paidAt?: string }) =>
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
  ecommerceProducts: () => apiRequest<any[]>('/api/ecommerce/products'),
  createEcommerceProduct: (input: Record<string, any>) => apiRequest<{ product: any }>('/api/ecommerce/products', { method: 'POST', body: JSON.stringify(input) }),
  updateEcommerceProduct: (id: string, input: Record<string, any>) => apiRequest<{ product: any }>('/api/ecommerce/products/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(input) }),
  deleteEcommerceProduct: (id: string) => apiRequest<{ ok: boolean }>('/api/ecommerce/products/' + encodeURIComponent(id), { method: 'DELETE' }),
  ecommerceSettings: () => apiRequest<{ settings: Record<string, any> }>('/api/ecommerce/settings'),
  updateEcommerceSettings: (settings: Record<string, any>) => apiRequest<{ settings: Record<string, any> }>('/api/ecommerce/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
  ecommerceNotifications: () => apiRequest<any[]>('/api/ecommerce/notifications'),
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
    serviceItems: (() => {
      const rows = tx.service_items ?? tx.serviceItems;
      if (!rows) return undefined;
      const parsed = typeof rows === 'string' ? JSON.parse(rows) : rows;
      return Array.isArray(parsed) ? parsed.map((item: any) => ({
        id: item.id,
        lineNo: Number(item.lineNo ?? item.line_no ?? 0),
        serviceId: item.serviceId ?? item.service_id,
        serviceName: item.serviceName ?? item.service_name ?? 'General Service',
        description: item.description || undefined,
        sellingPrice: Number(item.sellingPrice ?? item.selling_price ?? 0),
        customerPaid: Number(item.customerPaid ?? item.customer_paid ?? 0),
        customerPaymentMethod: item.customerPaymentMethod ?? item.customer_payment_method,
        vendorId: item.vendorId ?? item.vendor_id ?? undefined,
        vendorName: item.vendorName ?? item.vendor_name ?? undefined,
        vendorCost: Number(item.vendorCost ?? item.vendor_cost ?? 0),
        vendorPaid: Number(item.vendorPaid ?? item.vendor_paid ?? 0),
        vendorDue: Number(item.vendorDue ?? item.vendor_due ?? 0),
        accountCost: Number(item.accountCost ?? item.account_cost ?? 0),
        accountCostPaymentMethod: item.accountCostPaymentMethod ?? item.account_cost_payment_method,
        flightDetails: item.flightDetails ?? item.flight_details ?? undefined,
      })) : undefined;
    })(),
    sellingPrice: Number(tx.selling_price || 0),
    customerPaid: Number(tx.customer_paid || 0),
    customerDue: Number(tx.customer_due || 0),
    customerPaymentMethod: String(tx.customer_payment_method || tx.customerPaymentMethod || 'cash'),
    vendorId: tx.vendor_id,
    vendorCost: Number(tx.vendor_cost || 0),
    vendorPaid: Number(tx.vendor_paid || 0),
    vendorDue: Number(tx.vendor_due || 0),
    vendorPaymentMethod: tx.vendor_payment_method || tx.vendorPaymentMethod || undefined,
    accountCost: Number(tx.account_cost || 0),
    accountCostPaymentMethod: tx.account_cost_payment_method || tx.accountCostPaymentMethod || undefined,
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
      photo: input.customerPhoto || null,
    },
    serviceItems: Array.isArray(input.serviceItems) ? input.serviceItems.map((item: any) => ({
      serviceId: item.serviceId || null,
      serviceName: item.serviceName || 'General Service',
      description: item.description || null,
      flightDetails: item.flightDetails || null,
      sellingPrice: Number(item.sellingPrice || 0),
      customerPaid: Number(item.customerPaid || 0),
      customerPaymentMethod: String(item.customerPaymentMethod || input.customerPaymentMethod || 'Cash').toLowerCase(),
      hasVendor: Boolean(item.hasVendor),
      vendorId: item.vendorId || null,
      vendorName: item.hasVendor ? (item.vendorName || '') : '',
      vendorMobile: item.vendorMobile || '',
      vendorCompany: item.vendorCompany || '',
      vendorPhoto: item.vendorPhoto || null,
      vendorCost: Number(item.vendorCost || 0),
      vendorPaid: Number(item.vendorPaid || 0),
      vendorPaymentMethod: String(item.vendorPaymentMethod || 'Cash').toLowerCase(),
      accountCost: Number(item.accountCost || 0),
      accountCostPaymentMethod: String(item.accountCostPaymentMethod || 'Cash').toLowerCase(),
    })) : [],
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
      photo: input.vendorPhoto || null,
    } : null,
    vendorName: input.hasVendor ? (input.vendorName || '') : '',
    vendorCost: input.vendorCost,
    vendorPaid: input.vendorPaid,
    vendorPaymentMethod: String(input.vendorPaymentMethod || 'Cash').toLowerCase(),
    accountCost: Number(input.accountCost || 0),
    accountCostPaymentMethod: String(input.accountCostPaymentMethod || 'bKash').toLowerCase(),
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
  return { ...result, transaction: { ...mapServerTransaction(result.transaction), serviceItems: input.serviceItems || [] } };
};