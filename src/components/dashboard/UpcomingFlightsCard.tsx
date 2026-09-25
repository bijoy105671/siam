import React from 'react';
import { Plane, Calendar, ArrowRight, MessageSquare, PhoneCall } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatTime, getTicketStatusColor, sanitizePhoneForWhatsapp } from '../../utils/formatters';
import { FlightDetails, Transaction } from '../../types';

interface UpcomingFlightsCardProps {
  onViewAllFlights: () => void;
  onSelectFlight: (tx: Transaction) => void;
}

export const UpcomingFlightsCard: React.FC<UpcomingFlightsCardProps> = ({
  onViewAllFlights,
  onSelectFlight,
}) => {
  const { upcomingFlights, settings } = useApp();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Plane className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Next 30 Days Flights ({upcomingFlights.length})
            </h2>
            <p className="text-xs text-slate-500">
              Live flight departures & financial clearance status
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllFlights}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <span>Full Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {upcomingFlights.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No upcoming scheduled flights in the next 30 days.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 mt-2">
          {upcomingFlights.slice(0, 5).map((tx) => {
            const flight = tx.flightDetails as FlightDetails;
            const statusStyle = getTicketStatusColor(flight.ticketStatus);
            const hasCustomerDue = tx.customerDue > 0;
            const hasVendorDue = tx.vendorDue > 0;

            const whatsappMessage = encodeURIComponent(
              `FLIGHT NOTICE from ${settings.name}:\nDear ${flight.passengerName},\nFlight: ${flight.flightNumber} (${flight.airline})\nRoute: ${flight.route}\nDate: ${formatDate(flight.departureDate)} at ${formatTime(flight.departureTime)}\nPNR: ${flight.pnr}\nStatus: ${flight.ticketStatus}\n${hasCustomerDue ? `Remaining Balance: ${formatCurrency(tx.customerDue)}` : 'Payment Status: Fully Cleared (PAID)'}\nHelpline: ${settings.mobile}`
            );

            return (
              <div
                key={tx.id}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-lg px-2 transition-colors"
              >
                {/* Flight & Passenger Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0 text-center min-w-[50px]">
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      {new Date(flight.departureDate).toLocaleDateString('en-GB', { month: 'short' })}
                    </div>
                    <div className="text-base font-bold font-mono text-slate-900 leading-none">
                      {new Date(flight.departureDate).getDate()}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {flight.passengerName}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 font-mono">
                        {flight.route}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {flight.ticketStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-mono">
                      <span>{flight.airline} · {flight.flightNumber}</span>
                      <span>PNR: <strong className="text-slate-800">{flight.pnr}</strong></span>
                      <span>Time: {formatTime(flight.departureTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Dues & Quick Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-14 md:pl-0">
                  <div className="text-right">
                    {hasCustomerDue ? (
                      <div className="text-xs font-bold text-rose-600 font-mono">
                        Customer Due: {formatCurrency(tx.customerDue)}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-600 font-mono">
                        Customer: PAID (৳0 Due)
                      </div>
                    )}

                    {hasVendorDue ? (
                      <div className="text-[11px] font-medium text-rose-500 font-mono">
                        Vendor Due: {formatCurrency(tx.vendorDue)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-mono">
                        Vendor: Cleared
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {tx.customerMobile && (
                      <a
                        href={`https://wa.me/${sanitizePhoneForWhatsapp(tx.customerMobile)}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Send WhatsApp Flight Notice"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                    {tx.customerMobile && (
                      <a
                        href={`tel:${tx.customerMobile}`}
                        title="Call Passenger"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectFlight(tx)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
