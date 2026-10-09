import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart3, TrendingUp, PieChart as PieIcon, Sliders, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const RiskAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRiskAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load risk analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100">Risk Analytics &amp; Reporting</h1>
          </div>
          <p className="text-xs text-slate-400">
            Portfolio risk exposure, threshold sensitivity tradeoffs, and volume breakdowns
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Threshold Sensitivity Curve */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Threshold Sensitivity &amp; Escalation Curve
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Simulation Matrix</span>
          </div>

          <div className="h-72 w-full">
            {data?.threshold_sensitivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.threshold_sensitivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="threshold" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="flagged_percentage"
                    name="Flagged Rate (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flagged_count"
                    name="Transaction Count Flagged"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Loading sensitivity curves...
              </div>
            )}
          </div>
        </div>

        {/* Decision Breakdown */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <PieIcon className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-slate-200">Decision Outcome Distribution</h2>
            </div>

            <div className="space-y-3">
              {data?.decision_breakdown?.map((d: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200">{d.decision}</span>
                    <span className="font-mono text-slate-400">{d.count} transactions</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        d.decision === 'APPROVE'
                          ? 'bg-emerald-500'
                          : d.decision === 'STEP_UP_AUTH'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono mt-1">
                    {d.percentage}% of portfolio
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Policy targets: Fast Approval &ge; 70%, Step-up MFA &le; 20%, Human Review &le; 10%.
          </div>
        </div>
      </div>

      {/* Transaction Volume by Type */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Transaction Volume &amp; Mean Risk by Payment Rail
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Payment Modes</span>
        </div>

        <div className="h-64 w-full">
          {data?.types_breakdown ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.types_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="count" name="Total Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Loading rail analytics...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
