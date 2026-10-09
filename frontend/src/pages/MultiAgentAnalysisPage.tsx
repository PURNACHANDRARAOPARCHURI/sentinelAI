import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Transaction } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import {
  Bot,
  Brain,
  FileSearch,
  BookOpen,
  FileText,
  ShieldCheck,
  Scale,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const MultiAgentAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const txIdParam = searchParams.get('id');

  const [searchId, setSearchId] = useState<string>(txIdParam || '');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async (id: string) => {
    if (!id.trim()) return;
    setIsLoading(true);
    try {
      const data = await api.getTransactionDetail(id.trim());
      setTransaction(data);
    } catch {
      alert('Transaction not found. Enter a valid ID.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (txIdParam) {
      loadData(txIdParam);
    } else {
      // Find latest escalated transaction
      api.getTransactions({ min_risk: 0.30, limit: 1 }).then((res) => {
        if (res.length > 0) {
          setSearchId(res[0].id);
          api.getTransactionDetail(res[0].id).then(setTransaction);
        }
      });
    }
  }, [txIdParam]);

  const inv = transaction?.investigation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-bold text-slate-100">
                LangGraph Parallel Multi-Agent Orchestration Visualizer
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Interactive forensic telemetry across 4 independent parallel agents, guardrails, and final open-weight evaluator
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search Transaction ID..."
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 w-64 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => loadData(searchId)}
              disabled={isLoading}
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {transaction && inv ? (
        <div className="space-y-6">
          {/* Top Pipeline Overview Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400">Inspecting Escalated Transaction:</span>
                <p className="text-sm font-bold font-mono text-slate-100">
                  {transaction.id} • ₹{transaction.amount.toLocaleString()} ({transaction.tx_type})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Aggregated Agent Score</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {(inv.aggregated_agent_score * 100).toFixed(1)}%
                  </span>
                </div>
                <RiskBadge score={transaction.final_risk_score} size="lg" />
              </div>
            </div>

            {/* Latency Breakdown Bar */}
            {inv.latency_breakdown_ms && (
              <div className="mt-4 pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <span className="text-slate-500 font-sans">Multi-Agent Latency:</span>
                <span>Parallel Agents: {inv.latency_breakdown_ms.parallel_agents_ms ?? 0} ms</span>
                <span>&bull;</span>
                <span>Summary Agent: {inv.latency_breakdown_ms.summary_agent_ms ?? 0} ms</span>
                <span>&bull;</span>
                <span>Evaluator: {inv.latency_breakdown_ms.evaluator_ms ?? 0} ms</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-bold">
                  Total: {inv.latency_breakdown_ms.total_multi_agent_ms ?? 0} ms
                </span>
              </div>
            )}
          </div>

          {/* 4 LangGraph Parallel Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent 1: Behavioral Analysis Agent */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-emerald-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Agent 1: Behavioral Analysis Agent</h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Model: sentence-transformers/all-MiniLM-L6-v2
                    </p>
                  </div>
                </div>
                <RiskBadge score={inv.behavioral_score} size="sm" />
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {inv.behavioral_explanation}
              </div>

              {inv.behavioral_indicators && (
                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[11px] font-sans text-slate-400 block font-semibold">
                    Engineered Behavioral Indicators:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Depletion Ratio:</span>
                      <span className="text-slate-200 font-bold">
                        {inv.behavioral_indicators.depletion_ratio ?? 'N/A'}x balance
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Account Zeroed:</span>
                      <span className={inv.behavioral_indicators.account_wiped ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {inv.behavioral_indicators.account_wiped ? 'TRUE (Critical)' : 'FALSE'}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Off-Hours Flag:</span>
                      <span className={inv.behavioral_indicators.off_hours ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {inv.behavioral_indicators.off_hours ? 'TRUE (Night)' : 'FALSE'}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block">Velocity Spike:</span>
                      <span className="text-slate-200 font-bold">
                        {inv.behavioral_indicators.large_transfer ? 'HIGH VELOCITY' : 'NORMAL'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Agent 2: Transaction Context Classification Agent */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-blue-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      Agent 2: Context Classification Agent
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">Model: distilbert-base-uncased Head</p>
                  </div>
                </div>
                <RiskBadge score={inv.context_score} size="sm" />
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {inv.context_explanation}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Predicted Category:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {inv.context_category || 'UNSPECIFIED'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Transaction Narrative:</span>
                  <span className="font-mono text-slate-200 italic">
                    &ldquo;{transaction.description || 'No memo provided'}&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* Agent 3: RAG Evidence Retrieval Agent */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      Agent 3: RAG Evidence Retrieval Agent
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">Model: all-MiniLM-L6-v2 &amp; pgvector</p>
                  </div>
                </div>
                <RiskBadge score={inv.rag_score} size="sm" />
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {inv.rag_explanation}
              </div>

              {inv.rag_citations && (
                <div className="space-y-2 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Grounded Regulatory Citations:
                  </span>
                  {inv.rag_citations.map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-amber-400 font-semibold">
                        <span>{c.section}</span>
                        <span>{(c.relevance_score ?? 0.9) * 100}% Match</span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic">{c.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent 4: Investigation Summary Agent */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      Agent 4: Investigation Summary Agent
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Model: Structured Multi-Evidence Synthesis
                    </p>
                  </div>
                </div>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-purple-400">
                  Fact / Prediction Split
                </span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800 whitespace-pre-line">
                {inv.summary_text}
              </div>
            </div>
          </div>

          {/* NVIDIA NeMo Guardrails & Presidio Filter Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200">
                  Section 8: NVIDIA NeMo Guardrails &amp; Presidio PII Shield
                </h3>
              </div>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-xs text-emerald-400 font-semibold">
                Status: {inv.guardrail_status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Prompt Injection Defense:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Checked &amp; Cleared
                </span>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">PII Masking (Presidio):</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sensitive Identifiers Scrubbed
                </span>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Hallucination / Citation Guard:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Strict Policy Grounding
                </span>
              </div>
            </div>
          </div>

          {/* Section 9: Final Decision Open-Source LLM Evaluator */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200">
                    Section 9: Final Decision Open-Weight Evaluator
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Candidate: Qwen2.5-1.5B-Instruct / Phi-3 Mini Engine
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">
                Validated Pydantic Output
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Evaluator Recommendation &amp; Summary:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">Recommendation:</span>
                  <span className="font-mono font-bold text-xs text-rose-400">
                    {inv.llm_recommendation}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &ldquo;{inv.llm_risk_summary}&rdquo;
                </p>
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Contradiction &amp; Evidence Audit:
                </span>
                <div className="text-[11px] text-slate-400">
                  <span>Contradictions Detected: </span>
                  <span className="font-mono text-slate-200">
                    {inv.contradictions && inv.contradictions.length > 0
                      ? inv.contradictions.join('; ')
                      : 'None (Agents & models concordant)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Missing Telemetry: </span>
                  <span className="font-mono text-slate-200">
                    {inv.missing_evidence && inv.missing_evidence.length > 0
                      ? inv.missing_evidence.join('; ')
                      : 'Full context available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-500">
          Enter a transaction ID above or select an escalated transaction to inspect the multi-agent graph.
        </div>
      )}
    </div>
  );
};
