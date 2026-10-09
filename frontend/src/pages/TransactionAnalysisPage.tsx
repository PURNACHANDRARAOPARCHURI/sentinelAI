import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { Search, Bot, Clock, ArrowRight, ShieldCheck, Database, Layers } from 'lucide-react';

export const TransactionAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const txIdParam = searchParams.get('id');

  const [searchId, setSearchId] = useState<string>(txIdParam || '');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadTransaction = async (id: string) => {
    if (!id.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getTransactionDetail(id.trim());
      setTransaction(data);
    } catch {
      setError('Transaction ID not found. Verify the ID or select one from the ledger.');
      setTransaction(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (txIdParam) {
      loadTransaction(txIdParam);
    } else {
      // Load most recent transaction by default
      api.getTransactions({ limit: 1 }).then((res) => {
        if (res.length > 0) {
          setSearchId(res[0].id);
          setTransaction(res[0]);
        }
      });
    }
  }, [txIdParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransaction(searchId);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Transaction Forensic Feature Analysis</h1>
            <p className="text-xs text-slate-400">
              Inspect engineered mathematical features, balance discrepancy vectors, and decision paths
            </p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Paste Transaction UUID..."
              className="w-full md:w-80 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
          {error}
        </div>
      )}

      {transaction && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Transaction Amount</span>
              <p className="text-xl font-bold font-mono text-slate-100">
                ₹{transaction.amount.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">{transaction.tx_type}</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Risk Evaluation</span>
              <div className="mt-1">
                <RiskBadge score={transaction.final_risk_score} size="lg" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Decision Status</span>
              <span
                className={`inline-block mt-1 font-mono font-bold text-xs px-2.5 py-1 rounded border ${
                  transaction.decision === 'APPROVE'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : transaction.decision === 'STEP_UP_AUTH'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
              >
                {transaction.decision} ({transaction.status})
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-[11px] text-slate-400 block mb-1">Execution Speed</span>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {transaction.latency_ms} ms
              </p>
              <span className="text-[10px] text-slate-500">
                {transaction.escalated_to_agents ? 'Multi-Agent Investigation' : 'Fast Approval Path'}
              </span>
            </div>
          </div>

          {/* Account Balance Discrepancy Forensic Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <Database className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Origin Account Balance Dynamics</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Sender Account:</span>
                  <span className="font-mono text-slate-200 font-semibold">{transaction.sender_account}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Initial Balance:</span>
                  <span className="font-mono text-slate-200">
                    ₹{(transaction.oldbalance_org ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Post-Transfer Balance:</span>
                  <span className="font-mono text-slate-200">
                    ₹{(transaction.newbalance_orig ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Depletion Ratio:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {(
                      (transaction.amount / ((transaction.oldbalance_org ?? 0) + 1.0)) *
                      100
                    ).toFixed(1)}
                    % of funds
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <Database className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">Destination Account Dynamics</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Receiver Account:</span>
                  <span className="font-mono text-slate-200 font-semibold">{transaction.receiver_account}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Initial Balance:</span>
                  <span className="font-mono text-slate-200">
                    ₹{(transaction.oldbalance_dest ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Post-Transfer Balance:</span>
                  <span className="font-mono text-slate-200">
                    ₹{(transaction.newbalance_dest ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Zero Balance Anomaly:</span>
                  <span className="font-mono text-slate-200">
                    {transaction.oldbalance_dest === 0 && transaction.newbalance_dest === 0 ? (
                      <span className="text-rose-400 font-semibold">Yes (Ghost / External Node)</span>
                    ) : (
                      <span className="text-emerald-400">Normal</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Layer Feature Inspection */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Dual Core Model Inference Output</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Section 4 ML Layer</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold text-slate-300">XGBoost Classifier</p>
                <p className="text-[11px] text-slate-500 mb-2">Supervised Fraud Probability</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  {((transaction.xgboost_prob ?? 0) * 100).toFixed(2)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Trained on PaySim with scale_pos_weight
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold text-slate-300">Isolation Forest</p>
                <p className="text-[11px] text-slate-500 mb-2">Unsupervised Calibrated Anomaly</p>
                <p className="text-2xl font-bold font-mono text-blue-400">
                  {((transaction.isolation_forest_score ?? 0) * 100).toFixed(2)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Normalized quantile scaling [0 - 1]
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold text-slate-300">Initial Aggregator</p>
                <p className="text-[11px] text-slate-500 mb-2">Section 5 Weighted Ensemble</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {(transaction.initial_risk_score * 100).toFixed(2)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Cutoff threshold &le; 0.30 &rarr; Fast Path
                </p>
              </div>
            </div>
          </div>

          {/* If Escalated, Link to Multi-Agent Analysis */}
          {transaction.escalated_to_agents && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">
                    LangGraph Multi-Agent Investigation Executed
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Behavioral, Context, RAG Evidence, and Summary Agents evaluated this transaction
                  </p>
                </div>
              </div>
              <Link
                to={`/multi-agent?id=${transaction.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <span>View Multi-Agent Graph</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
