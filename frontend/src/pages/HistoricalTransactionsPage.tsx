import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { History, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const HistoricalTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const limit = 25;

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTransactions({
        search: searchTerm || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit,
      });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [typeFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100">Historical Banking Transactions Ledger</h1>
          </div>
          <p className="text-xs text-slate-400">
            Immutable transaction records, decisions, risk scores, and audit trails
          </p>
        </div>
        <button
          onClick={fetchLedger}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by sender, receiver, or UUID..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pl-9 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          </form>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="CASH_OUT">CASH_OUT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="DEBIT">DEBIT</option>
            <option value="CASH_IN">CASH_IN</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="OTP_PENDING">OTP_PENDING</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Transaction UUID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Sender Account</th>
                <th className="py-3 px-4">Receiver Account</th>
                <th className="py-3 px-4">ML Initial</th>
                <th className="py-3 px-4">Final Risk</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {tx.id.substring(0, 12)}...
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-100">
                    ₹{tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                      {tx.tx_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{tx.sender_account}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{tx.receiver_account}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {(tx.initial_risk_score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge score={tx.final_risk_score} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
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
                  <td className="py-3 px-4 font-mono text-slate-300">{tx.status}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/transaction-analysis?id=${tx.id}`}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-500">
                    No transactions matched the criteria.
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
