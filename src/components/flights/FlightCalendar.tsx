import React, { useState } from 'react';
import {
  Plane,
  Calendar as CalendarIcon,
  List,
  Filter,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  PhoneCall,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FlightDetails, TicketStatus, Transaction } from '../../types';
import { formatCurrency, formatDate, formatTime, getTicketStatusColor, sanitizePhoneForWhatsapp } from '../../utils/formatters';

interface FlightCalendarProps {
  onSelectFlight: (tx: Transaction) => void;
  onOpenPayment: (tx: Transaction, type: 'customer' | 'vendor') => void;
}

export const FlightCalendar: React.FC<FlightCalendarProps> = ({
  onSelectFlight,
  onOpenPayment,
}) => {
  const { transactions, updateFlightStatus, settings } = useApp();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Change Modal state
  const [editingFlightTx, setEditingFlightTx] = useState<Transaction | null>(null);
  const [newStatus, setNewStatus] = useState<TicketStatus>('Confirmed');
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Extract all flight transactions
  const allFlightTxs = transactions.filter(
    (t): t is Transaction & { flightDetails: FlightDetails } =>
      !!t.flightDetails && !!t.flightDetails.departureDate
  );

  // Filtered flights
  const filteredFlights = allFlightTxs.filter((tx) => {
    const f = tx.flightDetails;
    if (statusFilter !== 'all' && f.ticketStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        f.passengerName.toLowerCase().includes(q) ||
        f.pnr.toLowerCase().includes(q) ||
        f.ticketNumber.toLowerCase().includes(q) ||
        f.flightNumber.toLowerCase().includes(q) ||
        f.route.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => a.flightDetails.departureDate.localeCompare(b.flightDetails.departureDate));

  const handleOpenStatusModal = (tx: Transaction) => {
    setEditingFlightTx(tx);
    setNewStatus(tx.flightDetails?.ticketStatus || 'Confirmed');
    setStatusChangeNote('');
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlightTx) return;
    updateFlightStatus(editingFlightTx.id, newStatus, statusChangeNote);
    setEditingFlightTx(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-600" />
            <span>Flight Calendar & Dispatch Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Next 30-day departures, ticket verification, and financial clearance
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            placeholder="Search passenger, PNR, flight #, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Flight Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Schedule Changed">Schedule Changed</option>
            <option value="Reissued">Reissued</option>
            <option value="Refund">Refund</option>
            <option value="Void">Void</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Green: Confirmed & Paid</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Red: Due / Overdue</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Yellow: Schedule Change</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Blue: Refund</span>
          </span>
        </div>
      </div>

      {/* VIEW: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Flight Date & Time</th>
                  <th className="py-3 px-4">Passenger & Contact</th>
                  <th className="py-3 px-4">Airline / Flight</th>
                  <th className="py-3 px-4">Sector / Route</th>
                  <th className="py-3 px-4">PNR / Ticket</th>
                  <th className="py-3 px-4 text-center">Ticket Status</th>
                  <th className="py-3 px-4 text-right">Customer Due</th>
                  <th className="py-3 px-4 text-right">Vendor Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No matching flights found.
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((tx) => {
                    const f = tx.flightDetails;
                    const statusStyle = getTicketStatusColor(f.ticketStatus);
                    const hasCustDue = tx.customerDue > 0;
                    const hasVendDue = tx.vendorDue > 0;

                    const whatsappMsg = encodeURIComponent(
                      `*FLIGHT DISPATCH NOTICE - ${settings.name}*\n\nPassenger: ${f.passengerName}\nFlight: ${f.flightNumber} (${f.airline})\nRoute: ${f.route}\nDate: ${formatDate(f.departureDate)} at ${formatTime(f.departureTime)}\nPNR: ${f.pnr}\nStatus: ${f.ticketStatus}\n${hasCustDue ? `*Outstanding Customer Due: ${formatCurrency(tx.customerDue)}*` : 'Payment Status: Cleared (৳0 Due)'}\n\nPlease arrive at airport 4 hours prior. Safe journey!\nHelpline: ${settings.mobile}`
                    );

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          hasCustDue ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 font-mono">
                            {formatDate(f.departureDate)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatTime(f.departureTime)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{f.passengerName}</div>
                          <div className="text-[11px] text-slate-500">{tx.customerMobile}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-slate-800">{f.airline}</div>
                          <div className="text-[11px] text-blue-600 font-bold">{f.flightNumber}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {f.route}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {f.pnr}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {f.ticketNumber || 'Ticket Pending'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenStatusModal(tx)}
                            title="Click to change status"
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            <span>{f.ticketStatus}</span>
                            <Edit className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                          {hasCustDue ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {formatCurrency(tx.customerDue)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">PAID (৳0)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                          {hasVendDue ? (
                            <span className="text-amber-700 font-semibold">
                              {formatCurrency(tx.vendorDue)}
                            </span>
                          ) : (
                            <span className="text-slate-400">৳0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasCustDue && (
                              <button
                                onClick={() => onOpenPayment(tx, 'customer')}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                              >
                                Collect
                              </button>
                            )}
                            {tx.customerMobile && (
                              <a
                                href={`https://wa.me/${sanitizePhoneForWhatsapp(tx.customerMobile)}?text=${whatsappMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => onSelectFlight(tx)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                            >
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: CALENDAR CARDS VIEW */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlights.map((tx) => {
            const f = tx.flightDetails;
            const statusStyle = getTicketStatusColor(f.ticketStatus);
            const hasCustDue = tx.customerDue > 0;
            const hasVendDue = tx.vendorDue > 0;

            return (
              <div
                key={tx.id}
                className={`p-4 rounded-xl border bg-white shadow-xs space-y-3 ${
                  hasCustDue ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Plane className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {f.route}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                    {f.ticketStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{f.passengerName}</div>
                  <div className="text-slate-500 font-mono">
                    Date: <strong>{formatDate(f.departureDate)}</strong> at {formatTime(f.departureTime)}
                  </div>
                  <div className="text-slate-500 font-mono">
                    Airline: {f.airline} · {f.flightNumber}
                  </div>
                  <div className="text-slate-600 font-mono">
                    PNR: <strong className="text-blue-700">{f.pnr}</strong>
                  </div>
                </div>

                {/* Dues */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500">Customer:</div>
                    <div className={`font-bold ${hasCustDue ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {hasCustDue ? `Due: ${formatCurrency(tx.customerDue)}` : 'PAID'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">Vendor:</div>
                    <div className={`font-semibold ${hasVendDue ? 'text-amber-700' : 'text-slate-500'}`}>
                      {hasVendDue ? `Due: ${formatCurrency(tx.vendorDue)}` : 'Cleared'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenStatusModal(tx)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Change Status
                  </button>
                  <button
                    onClick={() => onSelectFlight(tx)}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    Invoice / Ticket
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TICKET STATUS CHANGE MODAL */}
      {editingFlightTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Flight Ticket Audit
                </div>
                <h3 className="font-bold text-white text-sm">
                  Update Ticket Status: {editingFlightTx.flightDetails?.pnr}
                </h3>
              </div>
              <button
                onClick={() => setEditingFlightTx(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ticket Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Schedule Changed">Schedule Changed</option>
                  <option value="Reissued">Reissued</option>
                  <option value="Refund">Refund</option>
                  <option value="Void">Void</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason / Note (Saved Permanently to Audit History)
                </label>
                <textarea
                  rows={3}
                  value={statusChangeNote}
                  placeholder="e.g. Airline delayed flight by 2 hours, informed passenger via WhatsApp"
                  onChange={(e) => setStatusChangeNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFlightTx(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                >
                  Save & Log Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
