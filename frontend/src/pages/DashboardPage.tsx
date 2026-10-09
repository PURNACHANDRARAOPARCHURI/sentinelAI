import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardSummary, RiskTrendItem, RiskDistributionBucket, Transaction } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import {
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  BarChart2,
  ArrowRight,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<RiskTrendItem[]>([]);
  const [distribution, setDistribution] = useState<RiskDistributionBucket[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sumData, trendData, distData, txData] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTrends(),
        api.getRiskDistribution(),
        api.getTransactions({ limit: 10 }),
      ]);
      setSummary(sumData);
      setTrends(trendData);
      setDistribution(distData);
      setRecentTx(txData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Executive Fraud Defense Dashboard</h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry, model metrics, and active investigation triage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/submit"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Transaction</span>
          </Link>
        </div>
      </div>

      {/* Top 8 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Analyzed</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {summary?.total_transactions.toLocaleString() ?? '...'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">100% processed via ML layer</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Detected Fraud</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 font-mono">
            {summary?.detected_fraud_count.toLocaleString() ?? '...'}
          </p>
          <p className="text-[11px] text-rose-400/80 mt-1 font-mono">
            {summary?.fraud_detection_rate ?? 0}% detection rate
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">False Positive Rate</span>
            <CheckCircle className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 font-mono">
            {summary ? `${(summary.false_positive_rate * 100).toFixed(2)}%` : '...'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Verified on PaySim test set</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Inference Latency</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {summary?.average_latency_ms ?? 0} ms
          </p>
          <p className="text-[11px] text-amber-400/80 mt-1 font-mono">
            P95: {summary?.p95_latency_ms ?? 0} ms (&lt;1s target)
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fraud Trends Area Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Fraud Trends Over Time</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Live Timeline</span>
          </div>

          <div className="h-64 w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fraudColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_tx"
                    name="Total Transactions"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#totalColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="fraud_tx"
                    name="Detected Fraud"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#fraudColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Awaiting transactional telemetry records...
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution Histogram */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">Risk Distribution</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Calibrated Scores</span>
          </div>

          <div className="h-64 w-full">
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" name="Transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Distribution will populate with transaction volume
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Recent Transactions &amp; Decisions</h2>
          </div>
          <Link to="/history" className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline">
            <span>View Full Ledger</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Sender &rarr; Receiver</th>
                <th className="py-2.5 px-3">ML Score</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-300 font-medium">
                    {tx.id.substring(0, 13)}...
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-100">
                    ₹{tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      {tx.tx_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {tx.sender_account} &rarr; {tx.receiver_account}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {(tx.initial_risk_score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3">
                    <RiskBadge score={tx.final_risk_score} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                        tx.decision === 'APPROVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : tx.decision === 'STEP_UP_AUTH'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {tx.decision}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{tx.latency_ms} ms</td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      to={`/transaction-analysis?id=${tx.id}`}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                    No transactions recorded yet. Submit a transaction above to view decisions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
