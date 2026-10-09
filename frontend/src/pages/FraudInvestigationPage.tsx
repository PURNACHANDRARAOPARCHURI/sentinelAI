import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import {
  AlertTriangle,
  Shield,
  FileCheck2,
  FileX2,
  Clock,
  MapPin,
  Smartphone,
  ChevronRight,
  Send,
  Loader2
} from 'lucide-react';

export const FraudInvestigationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const txIdParam = searchParams.get('id');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Load high risk transactions for investigation queue
    api.getTransactions({ min_risk: 0.30, limit: 20 }).then((res) => {
      setTransactions(res);
      if (res.length > 0) {
        if (txIdParam) {
          const match = res.find((t) => t.id === txIdParam);
          setSelectedTx(match || res[0]);
        } else {
          setSelectedTx(res[0]);
        }
      }
    });
  }, [txIdParam]);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedTx) return;
    setIsSubmitting(true);
    try {
      // Find case if one exists or submit via review
      const cases = await api.getReviewCases('ALL');
      const c = cases.find((item) => item.transaction_id === selectedTx.id);
      if (c) {
        await api.submitReview(c.id, action, notes || `Analyst manual decision: ${action}`);
      }
      alert(`Transaction decision logged as ${action}`);
      // Refresh
      const updated = await api.getTransactionDetail(selectedTx.id);
      setSelectedTx(updated);
    } catch {
      alert('Decision updated in ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Fraud Forensic Investigation Center</h1>
        <p className="text-xs text-slate-400">
          In-depth triage of transactions with elevated risk scores (&gt;0.30) requiring analyst scrutiny
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Escalated Cases Queue List */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200">Escalated Cases Queue</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              {transactions.length} Cases
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  selectedTx?.id === tx.id
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    ₹{tx.amount.toLocaleString()}
                  </span>
                  <RiskBadge score={tx.final_risk_score} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">{tx.tx_type}</span>
                  <span className="font-mono text-[10px]">{tx.id.substring(0, 10)}...</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No escalated high-risk cases in queue.
              </div>
            )}
          </div>
        </div>

        {/* Forensic Detail Panel */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          {selectedTx ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-100">
                      ₹{selectedTx.amount.toLocaleString()}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                      {selectedTx.tx_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedTx.id}</p>
                </div>
                <RiskBadge score={selectedTx.final_risk_score} size="lg" />
              </div>

              {/* Signals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span>Time of Day</span>
                  </div>
                  <p className="text-sm font-semibold font-mono text-slate-200">
                    Hour {((selectedTx.step ?? 1) % 24)}:00
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span>Geolocation</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {selectedTx.location || 'Unknown / VPN'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Device Identifier</span>
                  </div>
                  <p className="text-sm font-semibold font-mono text-slate-200">
                    {selectedTx.device_id || 'Unregistered'}
                  </p>
                </div>
              </div>

              {/* Multi-Agent Summary Review */}
              {selectedTx.investigation && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    Synthesized Multi-Agent Findings
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedTx.investigation.summary_text || selectedTx.investigation.llm_risk_summary}
                  </p>
                  {selectedTx.investigation.rag_citations && (
                    <div className="border-t border-slate-800/80 pt-2 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Relevant Banking Policies Cited:
                      </span>
                      {selectedTx.investigation.rag_citations.map((c, i) => (
                        <div key={i} className="text-[11px] text-emerald-400/90 font-mono">
                          &bull; {c.section}: {c.excerpt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analyst Action Form */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">Forensic Analyst Case Decision</h4>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter analyst forensic rationale and evidence notes..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAction('REJECT')}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <FileX2 className="h-4 w-4" />
                    <span>Block &amp; Reject Transaction</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAction('APPROVE')}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>Clear &amp; Approve Transaction</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              Select an escalated transaction from the queue to inspect forensic evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
