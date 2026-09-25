import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  Download,
  RotateCcw,
  Eye,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileSpreadsheet,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import { DateRangePicker } from '../common/DateRangePicker';
import { AuditVisualSummary } from './AuditVisualSummary';

export const AuditHistoryView: React.FC = () => {
  const { auditLogs } = useApp();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterActionType, setFilterActionType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyChanges, setOnlyChanges] = useState(false); // Only records with Previous Value

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Distinct users in logs
  const distinctUsers = useMemo(() => {
    const users = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.user) users.add(log.user);
    });
    return Array.from(users).sort();
  }, [auditLogs]);

  // Today and yesterday strings
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // 1. Record Type filter
      if (filterRecordType !== 'all' && log.recordType !== filterRecordType) {
        return false;
      }

      // 2. User filter
      if (filterUser !== 'all' && log.user !== filterUser) {
        return false;
      }

      // 3. Action Type filter
      if (filterActionType !== 'all') {
        const actionLower = log.action.toLowerCase();
        if (filterActionType === 'created' && !actionLower.includes('create') && !actionLower.includes('add') && !actionLower.includes('initial')) {
          return false;
        }
        if (filterActionType === 'updated' && !actionLower.includes('update') && !actionLower.includes('snooze') && !actionLower.includes('change')) {
          return false;
        }
        if (filterActionType === 'deleted' && !actionLower.includes('delete') && !actionLower.includes('remove')) {
          return false;
        }
        if (filterActionType === 'payment' && !actionLower.includes('payment') && !actionLower.includes('received')) {
          return false;
        }
        if (filterActionType === 'auth' && !actionLower.includes('login') && !actionLower.includes('logout')) {
          return false;
        }
      }

      // 4. Date Range filter (Between specific start and end dates)
      if (startDate && log.date < startDate) {
        return false;
      }
      if (endDate && log.date > endDate) {
        return false;
      }

      // 5. Only records with previous value
      if (onlyChanges && !log.previousValue) {
        return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (log.user && log.user.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.recordType && log.recordType.toLowerCase().includes(q)) ||
          (log.recordId && log.recordId.toLowerCase().includes(q)) ||
          (log.date && log.date.includes(q)) ||
          (log.time && log.time.includes(q)) ||
          (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
          (log.newValue && log.newValue.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    });
  }, [
    auditLogs,
    filterRecordType,
    filterUser,
    filterActionType,
    startDate,
    endDate,
    onlyChanges,
    searchQuery,
    todayStr,
    yesterdayStr,
    sevenDaysAgoStr,
    thirtyDaysAgoStr,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const todayCount = auditLogs.filter((l) => l.date === todayStr).length;
    const modifiedCount = auditLogs.filter((l) => Boolean(l.previousValue)).length;
    return {
      total: auditLogs.length,
      today: todayCount,
      users: distinctUsers.length,
      modifications: modifiedCount,
    };
  }, [auditLogs, todayStr, distinctUsers]);

  // Reset filters
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterRecordType !== 'all' ||
    filterUser !== 'all' ||
    filterActionType !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    onlyChanges;

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRecordType('all');
    setFilterUser('all');
    setFilterActionType('all');
    setStartDate('');
    setEndDate('');
    setOnlyChanges(false);
  };

  // Comprehensive CSV Export for backup and external analysis
  const handleExportCSV = (exportAll = false) => {
    const logsToExport = exportAll ? auditLogs : filteredLogs;
    if (logsToExport.length === 0) return;

    // Comprehensive column headers for auditors and external accounting/BI analysis
    const headers = [
      'Audit Event ID',
      'Date (YYYY-MM-DD)',
      'Time (24h)',
      'Timestamp Formatted',
      'Operator User',
      'Operator Role',
      'Action Executed',
      'Target Record / Entity Type',
      'Target Record ID / Invoice',
      'Previous Value (State Before)',
      'New Value (Recorded State)',
      'Change Type',
      'Change Details / Summary',
    ];

    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logsToExport.map((log) => {
      const role = log.user.toLowerCase().includes('admin')
        ? 'Administrator'
        : log.user.toLowerCase().includes('system')
        ? 'System Service'
        : 'Staff';

      const changeType =
        log.previousValue && log.newValue
          ? 'Modification'
          : log.previousValue && !log.newValue
          ? 'Deletion'
          : 'Creation / Addition';

      const changeDetails = log.newValue || log.previousValue || log.action;

      return [
        escapeCsvField(log.id),
        escapeCsvField(log.date),
        escapeCsvField(log.time),
        escapeCsvField(`${formatDate(log.date)} ${formatTime(log.time)}`),
        escapeCsvField(log.user),
        escapeCsvField(role),
        escapeCsvField(log.action),
        escapeCsvField(log.recordType),
        escapeCsvField(log.recordId),
        escapeCsvField(log.previousValue || ''),
        escapeCsvField(log.newValue || ''),
        escapeCsvField(changeType),
        escapeCsvField(changeDetails),
      ];
    });

    // Add \uFEFF (UTF-8 BOM) so Excel and Google Sheets properly render Bengali text and currency symbols
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const dateRangeSuffix = exportAll
      ? 'All_Records'
      : startDate && endDate
      ? `${startDate}_to_${endDate}`
      : startDate
      ? `from_${startDate}`
      : endDate
      ? `up_to_${endDate}`
      : todayStr;

    link.setAttribute('download', `SIAM_AIR_Audit_Trail_${dateRangeSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccessMessage(
      `Successfully exported ${logsToExport.length} audit records to CSV (${
        exportAll ? 'All records' : 'Filtered view'
      })!`
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // Helper to format values for display
  const renderValuePreview = (val?: string) => {
    if (!val) {
      return <span className="text-slate-400 italic font-sans">— None (Initial)</span>;
    }

    // Try parsing as JSON to display clean preview
    if (val.startsWith('{') || val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          if (keys.length === 1 && typeof parsed[keys[0]] !== 'object') {
            return (
              <span className="font-mono text-slate-800">
                {keys[0]}: <strong>{String(parsed[keys[0]])}</strong>
              </span>
            );
          }
          return (
            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
              {keys.slice(0, 3).map((k) => `${k}: ${String(parsed[k]).slice(0, 15)}`).join(', ')}
              {keys.length > 3 ? '...' : ''}
            </span>
          );
        }
      } catch {
        // Fall back to plain text
      }
    }

    return <span className="text-slate-800 line-clamp-2 leading-relaxed">{val}</span>;
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('create') || act.includes('add') || act.includes('initial')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('update') || act.includes('change') || act.includes('snooze')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (act.includes('payment') || act.includes('received')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('transfer')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Audit Directive Title */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Permanent System Audit Trail
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Tamper-Evident</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every important action is permanently recorded with User Identification, Timestamps, Target Entity, and Pre/Post Value Transitions.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            {hasActiveFilters && filteredLogs.length !== auditLogs.length && (
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Export entire unfiltered audit log (all records)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export All ({auditLogs.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Export currently filtered audit log table as CSV for backup and external analysis"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {hasActiveFilters
                  ? `Export Filtered CSV (${filteredLogs.length})`
                  : `Export CSV (${filteredLogs.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Export Success Message Banner */}
        {exportSuccessMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Total Logged Events
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {stats.total.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">
              Logged Today
            </span>
            <span className="text-lg font-bold text-blue-800 tabular-nums">
              {stats.today.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
            <span className="text-[11px] font-medium text-purple-700 uppercase tracking-wider block">
              Active Operators
            </span>
            <span className="text-lg font-bold text-purple-800 tabular-nums">
              {stats.users}
            </span>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
            <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider block">
              Changes With Prior Values
            </span>
            <span className="text-lg font-bold text-amber-800 tabular-nums">
              {stats.modifications.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by user, action, record ID, previous or new value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Picker Popover */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate, endDate }) => {
              setStartDate(startDate);
              setEndDate(endDate);
            }}
            onClear={() => {
              setStartDate('');
              setEndDate('');
            }}
          />

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                !startDate && !endDate
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                startDate === todayStr && endDate === todayStr
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(yesterdayStr);
                setEndDate(yesterdayStr);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                startDate === yesterdayStr && endDate === yesterdayStr
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(sevenDaysAgoStr);
                setEndDate(todayStr);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                startDate === sevenDaysAgoStr && endDate === todayStr
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns & Date Range Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Filter by Record/Entity Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Entity / Record Type</span>
            </label>
            <select
              value={filterRecordType}
              onChange={(e) => setFilterRecordType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 text-slate-800"
            >
              <option value="all">All Entity Types</option>
              <option value="Transaction">Transactions (Sales / Invoices)</option>
              <option value="Payment">Payments (Customer & Vendor)</option>
              <option value="Customer">Customers</option>
              <option value="Vendor">Vendors</option>
              <option value="Expense">Expenses</option>
              <option value="Transfer">Transfers</option>
              <option value="Service">Services</option>
              <option value="User">User Accounts & Logins</option>
              <option value="Settings">Settings & System</option>
            </select>
          </div>

          {/* Filter by User */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Authorized Operator</span>
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 text-slate-800"
            >
              <option value="all">All Users & Operators</option>
              {distinctUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Action Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Action Category</span>
            </label>
            <select
              value={filterActionType}
              onChange={(e) => setFilterActionType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 text-slate-800"
            >
              <option value="all">All Actions</option>
              <option value="created">Created / Added</option>
              <option value="updated">Updated / Modified / Status</option>
              <option value="deleted">Deleted / Removed</option>
              <option value="payment">Payments (Customer & Vendor)</option>
              <option value="auth">Auth (Login & Logout)</option>
            </select>
          </div>

          {/* Start Date (From) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Start Date (From)</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                if (endDate && val && endDate < val) {
                  setEndDate(val);
                }
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* End Date (To) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>End Date (To)</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setEndDate(val);
                if (startDate && val && startDate > val) {
                  setStartDate(val);
                }
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        {/* Filter toggles & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyChanges}
              onChange={(e) => setOnlyChanges(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700 font-medium">
              Only show records with Previous Value transitions (updates / deletions)
            </span>
          </label>

          <div className="flex items-center gap-3">
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>
                  {startDate && endDate
                    ? `${formatDate(startDate)} → ${formatDate(endDate)}`
                    : startDate
                    ? `From ${formatDate(startDate)}`
                    : `Up to ${formatDate(endDate)}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="hover:text-blue-900 p-0.5 cursor-pointer"
                  title="Clear date range filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="text-slate-500 text-xs tabular-nums">
              Showing <strong>{filteredLogs.length}</strong> of {auditLogs.length} events
            </span>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Summary Section (Recharts) */}
      <AuditVisualSummary
        logs={filteredLogs}
        startDate={startDate}
        endDate={endDate}
        totalUnfilteredCount={auditLogs.length}
      />

      {/* Main Audit Trail Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 font-mono whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Operator / User</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Action Executed</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Record / Entity</th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[200px]">Previous Value</th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[220px]">New Value Recorded</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 text-sm">No audit records match your filters</p>
                      <p className="text-xs text-slate-500">
                        Try clearing search terms or selecting 'All Time' to view older activity logs.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear all filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isToday = log.date === todayStr;
                  const isYesterday = log.date === yesterdayStr;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-900 font-semibold text-xs flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {formatTime(log.time)}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            {isToday ? (
                              <span className="text-blue-600 font-semibold">Today</span>
                            ) : isYesterday ? (
                              <span className="text-slate-600 font-semibold">Yesterday</span>
                            ) : (
                              formatDate(log.date)
                            )}
                            <span className="text-slate-400 font-mono text-[10px]">({log.date})</span>
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {log.user ? log.user.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 leading-tight">
                              {log.user}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {log.user.toLowerCase().includes('admin')
                                ? 'Admin Role'
                                : log.user.toLowerCase().includes('system')
                                ? 'Automated Service'
                                : 'Staff User'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Target Record */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">
                            {log.recordType}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {log.recordId}
                          </span>
                        </div>
                      </td>

                      {/* Previous Value */}
                      <td className="py-3 px-3.5 max-w-xs text-xs">
                        <div className="p-1.5 rounded bg-slate-50/80 border border-slate-200/60 max-h-16 overflow-hidden">
                          {renderValuePreview(log.previousValue)}
                        </div>
                      </td>

                      {/* New Value */}
                      <td className="py-3 px-3.5 max-w-sm text-xs">
                        <div className="p-1.5 rounded bg-emerald-50/40 border border-emerald-100 max-h-16 overflow-hidden">
                          {renderValuePreview(log.newValue)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Full Audit Event & Diff Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>
            Click on any row to open the full Before/After diff and change details inspector.
          </span>
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700 tabular-nums">
              Showing {filteredLogs.length} of {auditLogs.length} total events
            </span>
            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download CSV file for backup and analysis"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Event Detail & Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Audit Event Details</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold border ${getActionBadgeColor(
                        selectedLog.action
                      )}`}
                    >
                      {selectedLog.action}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedLog.id} • {selectedLog.recordType} ({selectedLog.recordId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Operator / User</span>
                  <span className="font-bold text-slate-900">{selectedLog.user}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Date & Time</span>
                  <span className="font-mono text-slate-900">
                    {selectedLog.date} {formatTime(selectedLog.time)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Entity Type</span>
                  <span className="font-semibold text-slate-900">{selectedLog.recordType}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Target Record ID</span>
                  <span className="font-mono text-slate-900 truncate block">{selectedLog.recordId}</span>
                </div>
              </div>

              {/* Side-by-side Before vs After Diff comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>State Transition: Previous vs New Value</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Audit Directive Compliance
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Previous Value Box */}
                  <div className="border border-rose-200/70 bg-rose-50/20 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-100">
                        <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Previous Value (Before)
                        </span>
                        {selectedLog.previousValue && (
                          <button
                            onClick={() => handleCopy(selectedLog.previousValue || '', 'prev')}
                            className="flex items-center gap-1 text-[11px] text-rose-700 hover:text-rose-900 cursor-pointer"
                          >
                            {copiedField === 'prev' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedField === 'prev' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      {selectedLog.previousValue ? (
                        <div className="bg-white p-3 rounded-lg border border-rose-100 text-xs text-slate-800 whitespace-pre-wrap font-mono break-all max-h-56 overflow-y-auto">
                          {selectedLog.previousValue}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No previous record (Initial creation or state initialization)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* New Value Box */}
                  <div className="border border-emerald-200/70 bg-emerald-50/20 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          New Value (Recorded)
                        </span>
                        {selectedLog.newValue && (
                          <button
                            onClick={() => handleCopy(selectedLog.newValue || '', 'new')}
                            className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            {copiedField === 'new' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedField === 'new' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      {selectedLog.newValue ? (
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs text-slate-800 whitespace-pre-wrap font-mono break-all max-h-56 overflow-y-auto">
                          {selectedLog.newValue}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No new value recorded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Log entry verified in immutable local ledger
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
