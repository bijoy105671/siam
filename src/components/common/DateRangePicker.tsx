import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X, ArrowRight, Check } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onClear?: () => void;
  className?: string;
  showPresets?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  onClear,
  className = '',
  showPresets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Helper date generators
  const getToday = () => new Date().toISOString().split('T')[0];

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const getThisMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const start = `${year}-${month}-01`;
    const end = getToday();
    return { start, end };
  };

  const getLastMonthRange = () => {
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
    const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);

    const format = (d: Date) => d.toISOString().split('T')[0];
    return {
      start: format(firstDayOfPrevMonth),
      end: format(lastDayOfPrevMonth),
    };
  };

  const hasRange = Boolean(startDate || endDate);

  // Display label
  const getDisplayLabel = () => {
    if (!startDate && !endDate) {
      return 'Filter by Date Range';
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDate(startDate);
      }
      return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDate(startDate)}`;
    }
    return `Up to ${formatDate(endDate)}`;
  };

  const handlePreset = (start: string, end: string) => {
    onChange({ startDate: start, endDate: end });
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange({ startDate: '', endDate: '' });
    if (onClear) onClear();
    setIsOpen(false);
  };

  const isPresetActive = (start: string, end: string) => {
    return startDate === start && endDate === end;
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            hasRange
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs ring-1 ring-blue-500/20'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 ${hasRange ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className="truncate max-w-[200px] sm:max-w-[260px]">{getDisplayLabel()}</span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {hasRange && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Clear date range"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Select Date Range</span>
            </span>
            {hasRange && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Presets */}
          {showPresets && (
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Quick Range Presets
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handlePreset(getToday(), getToday())}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getToday(), getToday())
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(getYesterday(), getYesterday())}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getYesterday(), getYesterday())
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(getDaysAgo(7), getToday())}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getDaysAgo(7), getToday())
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(getDaysAgo(30), getToday())}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getDaysAgo(30), getToday())
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { start, end } = getThisMonthRange();
                    handlePreset(start, end);
                  }}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getThisMonthRange().start, getThisMonthRange().end)
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { start, end } = getLastMonthRange();
                    handlePreset(start, end);
                  }}
                  className={`px-2 py-1 rounded text-left font-medium transition-colors ${
                    isPresetActive(getLastMonthRange().start, getLastMonthRange().end)
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Last Month
                </button>
              </div>
            </div>
          )}

          {/* Dual Date Inputs */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Custom Range
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      startDate: val,
                      endDate: endDate && val && endDate < val ? val : endDate,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  End Date (To)
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      startDate: startDate && val && startDate > val ? val : startDate,
                      endDate: val,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>
            </div>

            {/* Validation warning if invalid */}
            {startDate && endDate && startDate > endDate && (
              <p className="text-[11px] text-rose-600 font-medium">
                Start date cannot be after end date.
              </p>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Reset to All Time
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
