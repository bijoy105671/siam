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
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction, AppointmentReminder } from '../../types';
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
  const { transactions, customers, completeReminder, snoozeReminder, settings, appointments, createAppointment, updateAppointment, deleteAppointment } = useApp();
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(now);
  const [tab, setTab] = useState<'overdue' | 'today' | 'upcoming' | 'appointments' | 'completed'>('overdue');
  const [activeWhatsAppTx, setActiveWhatsAppTx] = useState<Transaction | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentReminder | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({ customerId:'', customerName:'', customerMobile:'', customerEmail:'', title:'Customer Appointment', appointmentDate:todayStr, appointmentTime:'10:00', note:'' });

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

  const openNewAppointment = () => {
    setEditingAppointment(null);
    setAppointmentForm({ customerId:'', customerName:'', customerMobile:'', customerEmail:'', title:'Customer Appointment', appointmentDate:todayStr, appointmentTime:'10:00', note:'' });
    setShowAppointmentForm(true);
  };
  const openEditAppointment = (a: AppointmentReminder) => {
    setEditingAppointment(a);
    setAppointmentForm({ customerId:a.customerId||'', customerName:a.customerName, customerMobile:a.customerMobile||'', customerEmail:a.customerEmail||'', title:a.title, appointmentDate:a.appointmentDate, appointmentTime:a.appointmentTime, note:a.note||'' });
    setShowAppointmentForm(true);
  };
  const saveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAppointment) await updateAppointment(editingAppointment.id, appointmentForm);
      else await createAppointment({ ...appointmentForm, status:'pending' });
      setShowAppointmentForm(false);
      setEditingAppointment(null);
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Appointment could not be saved.'); }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BellRing className="w-6 h-6 text-rose-600" />
          <span>Payment Reminders & Due Collector</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Automated collection alerts, WhatsApp reminders, and follow-up tracking
        </p>
      </div>
      <button onClick={openNewAppointment} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
        <Plus className="w-4 h-4" /> New Appointment
      </button>
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
          onClick={() => setTab('appointments')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${tab === 'appointments' ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Calendar className="w-3.5 h-3.5 text-violet-600" />
          <span>Appointments ({appointments.filter(a => a.status !== 'completed').length})</span>
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
          {tab === 'appointments' && (
            <div className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No appointments scheduled.</div>
              ) : appointments.slice().sort((a,b) => (a.appointmentDate+a.appointmentTime).localeCompare(b.appointmentDate+b.appointmentTime)).map((a) => (
                <div key={a.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${a.status === 'completed' ? 'opacity-60' : ''}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-violet-800 bg-violet-100 px-2 py-0.5 rounded">APPOINTMENT</span>
                      <span className="font-bold text-slate-900 text-sm">{a.customerName}</span>
                      {a.customerMobile && <span className="text-xs text-slate-500 font-mono">{a.customerMobile}</span>}
                    </div>
                    <div className="font-semibold text-slate-800 text-sm mt-1">{a.title}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">📅 {formatDate(a.appointmentDate)} · {formatTime(a.appointmentTime)}</div>
                    {a.note && <div className="text-[11px] text-slate-500 italic mt-1">Note: "{a.note}"</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.customerMobile && <a href={`tel:${a.customerMobile}`} className="p-2 text-blue-600 rounded-lg border border-slate-200"><PhoneCall className="w-4 h-4" /></a>}
                    {a.status !== 'completed' && <button onClick={() => updateAppointment(a.id,{status:'completed'})} className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">Done</button>}
                    <button onClick={() => openEditAppointment(a)} className="p-2 text-blue-600 rounded-lg border border-slate-200"><Pencil className="w-4 h-4" /></button>
                    <button onClick={async()=>{if(window.confirm('Delete this appointment?')){try{await deleteAppointment(a.id);}catch(err){window.alert(err instanceof Error?err.message:'Delete failed.');}}}} className="p-2 text-rose-600 rounded-lg border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

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

      {showAppointmentForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-900/50">
          <form onSubmit={saveAppointment} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div><h2 className="font-bold text-slate-900">{editingAppointment ? 'Edit Appointment' : 'New Appointment Reminder'}</h2><p className="text-[11px] text-slate-500">Customer appointment date, time and follow-up note.</p></div>
              <button type="button" onClick={()=>setShowAppointmentForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="text-xs font-semibold">Customer</label><input list="appointment-customer-list" value={appointmentForm.customerName} onChange={e=>{const v=e.target.value;const c=customers.find(x=>x.name.toLowerCase()===v.toLowerCase());setAppointmentForm(f=>({...f,customerId:c?.id||'',customerName:v,customerMobile:c?.mobile||f.customerMobile,customerEmail:c?.email||f.customerEmail}));}} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" placeholder="Customer name" required/><datalist id="appointment-customer-list">{customers.map(c=><option key={c.id} value={c.name}/>)}</datalist></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-xs font-semibold">Mobile</label><input value={appointmentForm.customerMobile} onChange={e=>setAppointmentForm(f=>({...f,customerMobile:e.target.value}))} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"/></div><div><label className="text-xs font-semibold">Appointment Title</label><input value={appointmentForm.title} onChange={e=>setAppointmentForm(f=>({...f,title:e.target.value}))} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" required/></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-xs font-semibold">Date</label><input type="date" value={appointmentForm.appointmentDate} onChange={e=>setAppointmentForm(f=>({...f,appointmentDate:e.target.value}))} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" required/></div><div><label className="text-xs font-semibold">Time</label><input type="time" value={appointmentForm.appointmentTime} onChange={e=>setAppointmentForm(f=>({...f,appointmentTime:e.target.value}))} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" required/></div></div>
              <div><label className="text-xs font-semibold">Note</label><textarea value={appointmentForm.note} onChange={e=>setAppointmentForm(f=>({...f,note:e.target.value}))} rows={3} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" placeholder="Appointment details"/></div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t"><button type="button" onClick={()=>setShowAppointmentForm(false)} className="px-3 py-2 text-xs border rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg">{editingAppointment?'Update Appointment':'Save Appointment'}</button></div>
          </form>
        </div>
      )}

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
