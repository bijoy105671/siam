import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  RefreshCw,
  Trash2,
  CreditCard,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/formatters';

interface AuditVisualSummaryProps {
  logs: AuditLog[];
  startDate?: string;
  endDate?: string;
  totalUnfilteredCount?: number;
}

export const AuditVisualSummary: React.FC<AuditVisualSummaryProps> = ({
  logs,
  startDate,
  endDate,
  totalUnfilteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'both' | 'timeline' | 'donut'>('both');

  // Categorize log action
  const classifyAction = (log: AuditLog): 'creations' | 'updates' | 'deletions' | 'payments' | 'system' => {
    const act = log.action.toLowerCase();
    if (act.includes('delete') || act.includes('remove') || act.includes('void')) {
      return 'deletions';
    }
    if (act.includes('update') || act.includes('change') || act.includes('snooze') || act.includes('edit') || act.includes('modify')) {
      return 'updates';
    }
    if (act.includes('create') || act.includes('add') || act.includes('initial') || act.includes('new entry')) {
      return 'creations';
    }
    if (act.includes('payment') || act.includes('received') || act.includes('paid') || act.includes('transfer')) {
      return 'payments';
    }
    return 'system';
  };

  // Color mappings
  const COLORS = {
    creations: '#10B981', // Emerald
    updates: '#F59E0B',   // Amber
    deletions: '#EF4444', // Rose / Red
    payments: '#3B82F6',  // Blue
    system: '#8B5CF6',    // Purple / Indigo
  };

  // Distribution totals
  const distributionStats = useMemo(() => {
    let creations = 0;
    let updates = 0;
    let deletions = 0;
    let payments = 0;
    let system = 0;

    logs.forEach((log) => {
      const type = classifyAction(log);
      if (type === 'creations') creations++;
      else if (type === 'updates') updates++;
      else if (type === 'deletions') deletions++;
      else if (type === 'payments') payments++;
      else system++;
    });

    const total = logs.length || 1; // avoid / 0

    return {
      creations,
      updates,
      deletions,
      payments,
      system,
      total: logs.length,
      creationsPct: Math.round((creations / total) * 100),
      updatesPct: Math.round((updates / total) * 100),
      deletionsPct: Math.round((deletions / total) * 100),
      paymentsPct: Math.round((payments / total) * 100),
      systemPct: Math.round((system / total) * 100),
    };
  }, [logs]);

  // Donut chart data
  const donutData = useMemo(() => {
    const data = [
      { name: 'Creations & Additions', value: distributionStats.creations, color: COLORS.creations },
      { name: 'Updates & Modifications', value: distributionStats.updates, color: COLORS.updates },
      { name: 'Deletions & Removals', value: distributionStats.deletions, color: COLORS.deletions },
      { name: 'Payments & Transfers', value: distributionStats.payments, color: COLORS.payments },
      { name: 'System & Security', value: distributionStats.system, color: COLORS.system },
    ];
    return data.filter((d) => d.value > 0);
  }, [distributionStats]);

  // Timeline data grouped by date
  const timelineData = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        formattedDate: string;
        creations: number;
        updates: number;
        deletions: number;
        payments: number;
        system: number;
        total: number;
      }
    >();

    logs.forEach((log) => {
      const d = log.date;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          formattedDate: formatDate(d),
          creations: 0,
          updates: 0,
          deletions: 0,
          payments: 0,
          system: 0,
          total: 0,
        });
      }
      const item = map.get(d)!;
      const type = classifyAction(log);
      item[type]++;
      item.total++;
    });

    // Sort chronologically
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  // Custom Tooltip for Timeline Stacked Bar Chart
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 font-sans z-50">
          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
            <span>{dataItem.formattedDate}</span>
            <span className="text-[10px] text-slate-400 font-mono">({dataItem.date})</span>
          </div>
          <div className="space-y-1 pt-0.5">
            {dataItem.creations > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Creations:
                </span>
                <span className="font-bold tabular-nums">{dataItem.creations}</span>
              </div>
            )}
            {dataItem.updates > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Updates:
                </span>
                <span className="font-bold tabular-nums">{dataItem.updates}</span>
              </div>
            )}
            {dataItem.deletions > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Deletions:
                </span>
                <span className="font-bold tabular-nums">{dataItem.deletions}</span>
              </div>
            )}
            {dataItem.payments > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Payments:
                </span>
                <span className="font-bold tabular-nums">{dataItem.payments}</span>
              </div>
            )}
            {dataItem.system > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  System/Auth:
                </span>
                <span className="font-bold tabular-nums">{dataItem.system}</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-1 flex items-center justify-between font-bold text-slate-100">
              <span>Total Actions:</span>
              <span className="tabular-nums">{dataItem.total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Donut Chart
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = Math.round((data.value / (distributionStats.total || 1)) * 100);
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
            <span className="font-semibold">{data.name}</span>
          </div>
          <div className="text-slate-300 flex items-center justify-between gap-3 pt-0.5">
            <span>Count: <strong className="text-white">{data.value}</strong></span>
            <span>Share: <strong className="text-white">{pct}%</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (logs.length === 0) {
    return null;
  }

  const dateRangeLabel =
    startDate && endDate
      ? `${formatDate(startDate)} to ${formatDate(endDate)}`
      : startDate
      ? `From ${formatDate(startDate)} onward`
      : endDate
      ? `Up to ${formatDate(endDate)}`
      : 'All Time Activity';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Action Distribution & Activity Trends
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {distributionStats.total} Events
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Range: {dateRangeLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          {isExpanded && (
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Combined View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'timeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('donut')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'donut' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Distribution
              </button>
            </div>
          )}

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Collapse' : 'Show Charts'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {/* Creations */}
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-emerald-100">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PlusCircle className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 block leading-tight">Creations</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 tabular-nums">{distributionStats.creations}</span>
              <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                ({distributionStats.creationsPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Updates */}
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-amber-100">
          <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 block leading-tight">Updates</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 tabular-nums">{distributionStats.updates}</span>
              <span className="text-[10px] text-amber-600 font-semibold font-mono">
                ({distributionStats.updatesPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Deletions */}
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-rose-100">
          <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 block leading-tight">Deletions</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 tabular-nums">{distributionStats.deletions}</span>
              <span className="text-[10px] text-rose-600 font-semibold font-mono">
                ({distributionStats.deletionsPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-blue-100">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 block leading-tight">Payments</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 tabular-nums">{distributionStats.payments}</span>
              <span className="text-[10px] text-blue-600 font-semibold font-mono">
                ({distributionStats.paymentsPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* System/Auth */}
        <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-purple-100 col-span-2 sm:col-span-1">
          <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 block leading-tight">System / Auth</span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 tabular-nums">{distributionStats.system}</span>
              <span className="text-[10px] text-purple-600 font-semibold font-mono">
                ({distributionStats.systemPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart Area */}
      {isExpanded && (
        <div className="p-4 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* 1. Timeline Stacked Bar Chart */}
            {(activeTab === 'both' || activeTab === 'timeline') && (
              <div
                className={`${
                  activeTab === 'both' ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'
                } flex flex-col justify-between border border-slate-100 rounded-xl p-3.5 bg-slate-50/40`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Daily Activity Trend (Stacked Actions)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {timelineData.length} Active {timelineData.length === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <Tooltip content={<CustomTimelineTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-[11px] font-medium text-slate-700 capitalize">
                            {value}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="creations"
                        name="Creations"
                        stackId="actions"
                        fill={COLORS.creations}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="updates"
                        name="Updates"
                        stackId="actions"
                        fill={COLORS.updates}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="deletions"
                        name="Deletions"
                        stackId="actions"
                        fill={COLORS.deletions}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="payments"
                        name="Payments"
                        stackId="actions"
                        fill={COLORS.payments}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="system"
                        name="System/Auth"
                        stackId="actions"
                        fill={COLORS.system}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 2. Donut Distribution Chart */}
            {(activeTab === 'both' || activeTab === 'donut') && (
              <div
                className={`${
                  activeTab === 'both' ? 'lg:col-span-5 xl:col-span-4' : 'lg:col-span-12'
                } flex flex-col justify-between border border-slate-100 rounded-xl p-3.5 bg-slate-50/40`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-purple-600" />
                    <span>Action Category Share</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    100% Normalized
                  </span>
                </div>

                <div className="h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomDonutTooltip />} />
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-slate-900 leading-none tabular-nums">
                      {distributionStats.total}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                      Total
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px]">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-slate-600 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="truncate">{d.name.split(' ')[0]}</span>
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {Math.round((d.value / distributionStats.total) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
