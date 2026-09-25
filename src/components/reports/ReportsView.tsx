import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Printer,
  Calendar,
  Layers,
  CreditCard,
  Landmark,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PaymentMethod } from '../../types';

export const ReportsView: React.FC = () => {
  const {
    transactions,
    expenses,
    accountBalances,
    totalAvailableMoney,
    totalCustomerReceivable,
    totalVendorPayable,
    services,
    settings,
  } = useApp();

  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'this_month' | 'this_year'>('this_month');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  // Filter transactions according to timeframe
  const filteredTxs = transactions.filter((t) => {
    if (timeframe === 'today') return t.date === todayStr;
    if (timeframe === 'this_month') return t.date >= firstOfMonth;
    if (timeframe === 'this_year') return t.date >= firstOfYear;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (timeframe === 'today') return e.date === todayStr;
    if (timeframe === 'this_month') return e.date >= firstOfMonth;
    if (timeframe === 'this_year') return e.date >= firstOfYear;
    return true;
  });

  // Financial aggregates
  const totalSales = filteredTxs.reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalVendorCost = filteredTxs.reduce((sum, t) => sum + t.vendorCost, 0);
  const totalGrossProfit = filteredTxs.reduce((sum, t) => sum + (t.grossProfit > 0 ? t.grossProfit : 0), 0);
  const totalGrossLoss = filteredTxs.reduce((sum, t) => sum + (t.grossProfit < 0 ? Math.abs(t.grossProfit) : 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossProfit - totalGrossLoss - totalExpenses;

  // Service-wise breakdown
  const serviceBreakdown = services.map((s) => {
    const sTxs = filteredTxs.filter((t) => t.serviceId === s.id);
    const count = sTxs.length;
    const sales = sTxs.reduce((sum, t) => sum + t.sellingPrice, 0);
    const cost = sTxs.reduce((sum, t) => sum + t.vendorCost, 0);
    const profit = sTxs.reduce((sum, t) => sum + t.grossProfit, 0);
    return {
      service: s.name,
      category: s.category,
      count,
      sales,
      cost,
      profit,
    };
  }).filter((item) => item.count > 0).sort((a, b) => b.profit - a.profit);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Financial Statements & Profit/Loss Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Accounting ledger reconciliations, service margins, and cash books
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Presets */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('this_month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'this_month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('this_year')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'this_year' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                timeframe === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT SHEET */}
      <div id="printable-report" className="space-y-6">
        {/* PROFIT & LOSS MASTER STATEMENT CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-base font-bold text-slate-900 uppercase tracking-wide">
                Comprehensive Profit & Loss Statement
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {settings.name} · Period: {timeframe.replace('_', ' ').toUpperCase()} (Ending {formatDate(todayStr)})
              </div>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Generated: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono mb-6">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Revenue / Sales</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(totalSales)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Vendor / Service Cost</div>
              <div className="text-lg font-bold text-slate-700 mt-0.5">{formatCurrency(totalVendorCost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Gross Profit Margin</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(totalGrossProfit)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Net Business Profit</div>
              <div className={`text-lg font-bold mt-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(netProfit)}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-700">1. Total Service & Ticket Sales (Turnover)</span>
              <span className="font-bold text-slate-900">{formatCurrency(totalSales)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
              <span>Less: Direct Vendor & Airline Ticket Costs</span>
              <span>- {formatCurrency(totalVendorCost)}</span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-slate-200 font-bold bg-emerald-50/50 px-2 rounded">
              <span className="text-emerald-900">Gross Profit (Sales - Vendor Cost)</span>
              <span className="text-emerald-700">{formatCurrency(totalGrossProfit - totalGrossLoss)}</span>
            </div>
            {totalGrossLoss > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100 text-rose-600 font-semibold px-2">
                <span>Loss from below-cost transactions</span>
                <span>- {formatCurrency(totalGrossLoss)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
              <span>Less: Operating Expenses (Rent, Salary, Utilities, Marketing)</span>
              <span>- {formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-b-2 border-slate-900 text-base font-bold px-2">
              <span className="text-slate-900">NET PROFIT (Before Tax)</span>
              <span className={netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* SERVICE-WISE PROFIT MARGIN TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase">
                Service-Wise Profitability Breakdown
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Air Tickets, Visa, Passports & Digital Services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Entries</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right">Vendor Cost</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {serviceBreakdown.map((row) => {
                  const marginPct = row.sales > 0 ? Math.round((row.profit / row.sales) * 100) : 0;
                  return (
                    <tr key={row.service} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">{row.service}</td>
                      <td className="py-2.5 px-3 text-slate-500">{row.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{row.count}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-bold">{formatCurrency(row.sales)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(row.cost)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(row.profit)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-600">{marginPct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LIQUID CASH BOOK & LEDGER RECONCILIATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Balances (Cash Book) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Liquid Cash & Bank Account Book
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {(Object.keys(accountBalances) as PaymentMethod[]).map((acc) => (
                <div key={acc} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">{acc} Account:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCurrency(accountBalances[acc] || 0)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 border-t-2 border-slate-900 text-sm font-bold bg-slate-50 px-2 rounded">
                <span>TOTAL AVAILABLE MONEY:</span>
                <span className="text-emerald-700">{formatCurrency(totalAvailableMoney)}</span>
              </div>
            </div>
          </div>

          {/* Dues Audit (Receivables vs Payables) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <CreditCard className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Customer & Vendor Due Ledger Audit
              </h3>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <div className="text-[10px] text-rose-800 uppercase font-bold">
                  Total Customer Receivable (Due)
                </div>
                <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
                  {formatCurrency(totalCustomerReceivable)}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5 font-sans">
                  Total money outstanding from customers across all invoices and opening dues.
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-[10px] text-amber-800 uppercase font-bold">
                  Total Vendor Payable (Due)
                </div>
                <div className="text-xl font-bold text-amber-800 mt-1 tabular-nums">
                  {formatCurrency(totalVendorPayable)}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 font-sans">
                  Total unpaid consolidator / airline liabilities.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
