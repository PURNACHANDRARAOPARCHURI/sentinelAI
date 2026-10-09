import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { HumanReviewCase } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { UserCheck, CheckCircle2, XCircle, RefreshCw, AlertCircle, FileText } from 'lucide-react';

export const HumanReviewPage: React.FC = () => {
  const [cases, setCases] = useState<HumanReviewCase[]>([]);
  const [filter, setFilter] = useState<string>('PENDING');
  const [selectedCase, setSelectedCase] = useState<HumanReviewCase | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReviewCases(filter);
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch (err) {
      console.error('Failed to load review cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filter]);

  const handleDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      await api.submitReview(selectedCase.id, action, notes || `Analyst manual decision: ${action}`);
      alert(`Case ${selectedCase.id} updated with decision: ${action}`);
      setNotes('');
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      alert('Error updating case decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100">Human-in-the-Loop Case Management</h1>
          </div>
          <p className="text-xs text-slate-400">
            Mandatory human compliance triage for critical high-risk escalations (&ge;0.70)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="PENDING">Pending Triage</option>
            <option value="APPROVED">Approved Cases</option>
            <option value="REJECTED">Blocked / Rejected</option>
            <option value="ALL">All Historical Cases</option>
          </select>
          <button
            onClick={fetchCases}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300">Triage Queue</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              {cases.length} Items
            </span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  selectedCase?.id === c.id
                    ? 'border-emerald-500/40 bg-emerald-500/10 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-100">
                    ₹{(c.transaction?.amount ?? 0).toLocaleString()}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      c.priority === 'CRITICAL'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {c.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">Case: {c.id.substring(0, 10)}...</span>
                  <span className="font-mono font-semibold text-slate-300">{c.status}</span>
                </div>
              </div>
            ))}
            {cases.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500">
                No cases currently in this review queue.
              </div>
            )}
          </div>
        </div>

        {/* Selected Case Triage Workstation */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          {selectedCase ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    Case #{selectedCase.id.substring(0, 13)}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Tx ID: {selectedCase.transaction_id}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                    selectedCase.status === 'PENDING'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : selectedCase.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {selectedCase.status}
                </span>
              </div>

              {selectedCase.transaction && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Transaction Amount:</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">
                      ₹{selectedCase.transaction.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Risk Score:</span>
                    <span className="font-mono text-rose-400 font-bold text-sm">
                      {(selectedCase.transaction.final_risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Sender Account:</span>
                    <span className="font-mono text-slate-300">
                      {selectedCase.transaction.sender_account}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Receiver Account:</span>
                    <span className="font-mono text-slate-300">
                      {selectedCase.transaction.receiver_account}
                    </span>
                  </div>
                </div>
              )}

              {selectedCase.reviewer_notes && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Previous Forensic Notes:
                  </span>
                  <p className="text-slate-300 italic">{selectedCase.reviewer_notes}</p>
                </div>
              )}

              {/* Triage Decision Actions */}
              {selectedCase.status === 'PENDING' ? (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-200">
                    Analyst Review Rationale &amp; Audit Log Entry:
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter compliance decision rationale, customer contact outcome, or evidence notes..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision('REJECT')}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Block &amp; Reject Case</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision('APPROVE')}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Case (Clear Fraud)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">
                  This case has been reviewed and closed by an authorized compliance officer.
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              Select a pending review case from the queue to start forensic triage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
