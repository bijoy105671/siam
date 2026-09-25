export type ApiError = { error?: string; [key: string]: unknown };

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    Object.assign(error, payload);
    throw error;
  }
  return payload;
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
  dashboard: () => apiRequest<Record<string, unknown>>('/api/dashboard'),
  customers: (q = '') =>
    apiRequest<unknown[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  vendors: (q = '') =>
    apiRequest<unknown[]>(`/api/vendors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  transactions: (limit = 100) =>
    apiRequest<unknown[]>(`/api/transactions?limit=${limit}`),
  accountBalances: () =>
    apiRequest<{ balances: Record<string, number>; total: number }>('/api/accounts/balances'),
  openingBalances: () =>
    apiRequest<unknown[]>('/api/opening-balances'),
};
