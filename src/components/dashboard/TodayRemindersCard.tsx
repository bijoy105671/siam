import React, { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  PhoneCall,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatTime, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { Transaction } from '../../types';
import { WhatsAppSenderModal } from '../whatsapp/WhatsAppSenderModal';

interface TodayRemindersCardProps {
  onViewAllReminders: () => void;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const TodayRemindersCard: React.FC<TodayRemindersCardProps> = ({
  onViewAllReminders,
  onOpenPayment,
}) => {
  const { todayReminders, overdueReminders, customers, completeReminder, snoozeReminder, settings } = useApp();
  const [activeWhatsAppTx, setActiveWhatsAppTx] = useState<Transaction | null>(null);

  const totalCount = todayReminders.length + overdueReminders.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <BellRing className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Payment Reminders ({totalCount})
            </h2>
            <p className="text-xs text-slate-500">
              Customer due collection schedule & follow-ups
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllReminders}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <span>All Reminders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {totalCount === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No reminders pending today. All payments are up to date!
        </div>
      ) : (
        <div className="divide-y divide-slate-100 mt-2 space-y-1">
          {/* Overdue Items first */}
          {overdueReminders.map((tx) => {
            const message = encodeURIComponent(
              `Dear ${tx.customerName}, payment reminder from ${settings.name}:\nOutstanding Due: ${formatCurrency(tx.customerDue)} for ${tx.serviceName} (Ref: ${tx.invoiceNumber}). Kindly clear the balance today. Helpline: ${settings.mobile}`
            );

            return (
              <div
                key={tx.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-rose-50/40 rounded-lg px-2 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1 font-mono uppercase bg-rose-100 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      OVERDUE — {tx.overdueDays} {tx.overdueDays === 1 ? 'DAY' : 'DAYS'}
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {tx.customerName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>Due: <strong className="text-rose-600 font-mono">{formatCurrency(tx.customerDue)}</strong></span>
                    <span>Service: {tx.serviceName}</span>
                    <span>Invoice: {tx.invoiceNumber}</span>
                  </div>
                  {tx.reminderNote && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      Note: "{tx.reminderNote}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenPayment(tx, 'customer')}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Collect Due
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveWhatsAppTx(tx)}
                    title="Send WhatsApp Reminder"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {tx.customerMobile && (
                    <a
                      href={`tel:${tx.customerMobile}`}
                      title="Call Customer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => snoozeReminder(tx.id, 2)}
                    title="Snooze 2 Days"
                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => completeReminder(tx.id)}
                    title="Mark Done"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Today's Reminders */}
          {todayReminders.map((tx) => {
            const message = encodeURIComponent(
              `Dear ${tx.customerName}, payment reminder from ${settings.name}:\nOutstanding Due: ${formatCurrency(tx.customerDue)} for ${tx.serviceName} (Ref: ${tx.invoiceNumber}). Kindly settle today. Helpline: ${settings.mobile}`
            );

            return (
              <div
                key={tx.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/40 rounded-lg px-2 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1 font-mono uppercase bg-amber-100 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-amber-700" />
                      REMINDER TODAY
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {tx.customerName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>Due: <strong className="text-rose-600 font-mono">{formatCurrency(tx.customerDue)}</strong></span>
                    <span>Service: {tx.serviceName}</span>
                    <span>Invoice: {tx.invoiceNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenPayment(tx, 'customer')}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Collect Due
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveWhatsAppTx(tx)}
                    title="Send WhatsApp Reminder"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {tx.customerMobile && (
                    <a
                      href={`tel:${tx.customerMobile}`}
                      title="Call Customer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => snoozeReminder(tx.id, 1)}
                    title="Snooze 1 Day"
                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => completeReminder(tx.id)}
                    title="Mark Done"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Message Sender Modal */}
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
