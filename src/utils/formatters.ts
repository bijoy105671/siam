import { TicketStatus, TransactionStatus } from '../types';

export const formatCurrency = (amount: number, symbol: string = '৳'): string => {
  const rounded = Math.round(amount || 0);
  return `${symbol} ${rounded.toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  // Handles HH:mm
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const getTicketStatusColor = (status: TicketStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} => {
  switch (status) {
    case 'Confirmed':
    case 'Completed':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    case 'Schedule Changed':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    case 'Refund':
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/30',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800',
        dot: 'bg-sky-500',
      };
    case 'Void':
    case 'Cancelled':
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-500',
      };
    case 'Reissued':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      };
  }
};

export const getTransactionStatusColor = (status: TransactionStatus): {
  bg: string;
  text: string;
  border: string;
} => {
  switch (status) {
    case 'PAID':
      return {
        bg: 'bg-emerald-50 text-emerald-800',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      };
    case 'PARTIAL':
      return {
        bg: 'bg-amber-50 text-amber-800',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    case 'DUE':
      return {
        bg: 'bg-rose-50 text-rose-800',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    case 'REFUND':
      return {
        bg: 'bg-sky-50 text-sky-800',
        text: 'text-sky-700',
        border: 'border-sky-200',
      };
    case 'CANCELLED':
      return {
        bg: 'bg-slate-100 text-slate-800',
        text: 'text-slate-700',
        border: 'border-slate-200',
      };
  }
};

export const sanitizePhoneForWhatsapp = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  }
  return cleaned;
};
