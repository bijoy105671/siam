import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  Mail,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, formatTime, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { WhatsAppSenderModal } from '../whatsapp/WhatsAppSenderModal';

interface ReminderManagerProps {
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({
  onOpenPayment,
  onSelectTransaction,
}) => {
  const { transactions, customers, completeReminder, snoozeReminder, settings } = useApp();
  const [tab, setTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>('overdue');
  const [activeWhatsAppTx, setActiveWhatsAppTx] = useState<Transaction | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const overdueList: (Transaction & { overdueDays: number })[] = [];
  const todayList: Transaction[] = [];
  const upcomingList: Transaction[] = [];
  const completedList: Transaction[] = [];

  transactions.forEach((tx) => {
    if (tx.customerDue > 0 && tx.reminderDate) {
      if (tx.reminderStatus === 'completed') {
        completedList.push(tx);
      } else if (tx.reminderDate < todayStr) {
        const rDate = new Date(tx.reminderDate);
        const cDate = new Date(todayStr);
        const days = Math.max(1, Math.round((cDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24)));
        overdueList.push({ ...tx, overdueDays: days });
      } else if (tx.reminderDate === todayStr) {
        todayList.push(tx);
      } else {
        upcomingList.push(tx);
      }
    }
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BellRing className="w-6 h-6 text-rose-600" />
          <span>Payment Reminders & Due Collector</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Automated collection alerts, WhatsApp reminders, and follow-up tracking
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('overdue')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            tab === 'overdue'
              ? 'bg-rose-100 text-rose-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Overdue ({overdueList.length})</span>
        </button>

        <button
          onClick={() => setTab('today')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            tab === 'today'
              ? 'bg-amber-100 text-amber-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Due Today ({todayList.length})</span>
        </button>

        <button
          onClick={() => setTab('upcoming')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            tab === 'upcoming'
              ? 'bg-blue-100 text-blue-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Upcoming ({upcomingList.length})</span>
        </button>

        <button
          onClick={() => setTab('completed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
            tab === 'completed'
              ? 'bg-emerald-100 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Completed ({completedList.length})</span>
        </button>
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {tab === 'overdue' && (
            <>
              {overdueList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No overdue payments! All receivables are collected on time.
                </div>
              ) : (
                overdueList.map((tx) => {
                  const message = encodeURIComponent(
                    `URGENT DUE REMINDER - ${settings.name}\nDear ${tx.customerName},\nYou have an overdue balance of ${formatCurrency(tx.customerDue)} for ${tx.serviceName} (Ref: ${tx.invoiceNumber}).\nOriginal reminder date: ${formatDate(tx.reminderDate)}.\nKindly settle today to avoid travel disruption.\nHelpline: ${settings.mobile}`
                  );

                  return (
                    <div
                      key={tx.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-rose-50/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase">
                            OVERDUE — {tx.overdueDays} {tx.overdueDays === 1 ? 'DAY' : 'DAYS'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{tx.customerName}</span>
                          <span className="text-xs text-slate-500 font-mono">({tx.customerMobile})</span>
                        </div>

                        <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                          <span>Invoice: <strong>{tx.invoiceNumber}</strong></span>
                          <span>Service: {tx.serviceName}</span>
                          <span>Total Sale: {formatCurrency(tx.sellingPrice)}</span>
                          <span>Due: <strong className="text-rose-600 font-bold">{formatCurrency(tx.customerDue)}</strong></span>
                        </div>

                        {tx.reminderNote && (
                          <div className="text-[11px] text-slate-500 italic mt-1">
                            Note: "{tx.reminderNote}"
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => onOpenPayment(tx, 'customer')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                        >
                          Collect Due
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveWhatsAppTx(tx)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                          title="Send formatted WhatsApp message via business templates"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {tx.customerMobile && (
                          <a
                            href={`tel:${tx.customerMobile}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                            title="Call Customer"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => snoozeReminder(tx.id, 2)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
                        >
                          Snooze 2D
                        </button>

                        <button
                          onClick={() => completeReminder(tx.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200"
                          title="Mark Reminder Completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onSelectTransaction(tx)}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          Invoice
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'today' && (
            <>
              {todayList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No reminders scheduled for today.
                </div>
              ) : (
                todayList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-50/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase">
                          REMINDER TODAY
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{tx.customerName}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 font-mono">
                        Invoice: <strong>{tx.invoiceNumber}</strong> · Due:{' '}
                        <strong className="text-rose-600">{formatCurrency(tx.customerDue)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenPayment(tx, 'customer')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                      >
                        Collect Due
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveWhatsAppTx(tx)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                        title="Send formatted WhatsApp message"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      {tx.customerMobile && (
                        <a
                          href={`tel:${tx.customerMobile}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                          title="Call Customer"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => completeReminder(tx.id)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200"
                        title="Mark Reminder Completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'upcoming' && (
            <>
              {upcomingList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No upcoming future reminders scheduled.
                </div>
              ) : (
                upcomingList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{tx.customerName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Scheduled: <strong>{formatDate(tx.reminderDate)}</strong> at {formatTime(tx.reminderTime)} · Due: {formatCurrency(tx.customerDue)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveWhatsAppTx(tx)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        title="Send WhatsApp notice"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        View Invoice
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'completed' && (
            <>
              {completedList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No completed reminders history.
                </div>
              ) : (
                completedList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between gap-4 text-slate-500 text-xs font-mono"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{tx.customerName}</span> ({tx.invoiceNumber})
                    </div>
                    <span className="text-emerald-600 font-bold">COMPLETED</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Service-Integrated WhatsApp Message Dispatcher Modal */}
      {activeWhatsAppTx && (
        <WhatsAppSenderModal
          isOpen={!!activeWhatsAppTx}
          onClose={() => setActiveWhatsAppTx(null)}
          transaction={activeWhatsAppTx}
          customer={customers.find((c) => c.id === activeWhatsAppTx.customerId)}
          defaultTemplateKey="customerDueReminder"
        />
      )}
    </div>
  );
};
