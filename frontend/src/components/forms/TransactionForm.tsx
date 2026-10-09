import React, { useState } from 'react';
import { api } from '../../services/api';
import { Transaction } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { Send, CheckCircle2, AlertTriangle, ShieldAlert, KeyRound, Loader2, Sparkles } from 'lucide-react';

export const TransactionForm: React.FC<{ onTransactionComplete?: (tx: Transaction) => void }> = ({
  onTransactionComplete,
}) => {
  const [amount, setAmount] = useState<string>('10000');
  const [txType, setTxType] = useState<string>('TRANSFER');
  const [senderAccount, setSenderAccount] = useState<string>('1234567890');
  const [receiverAccount, setReceiverAccount] = useState<string>('9876543210');
  const [location, setLocation] = useState<string>('Hyderabad');
  const [deviceId, setDeviceId] = useState<string>('ABC123');
  const [description, setDescription] = useState<string>('Standard business supplier payout');
  const [oldbalanceOrg, setOldbalanceOrg] = useState<string>('50000');
  const [step, setStep] = useState<string>('14');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpMessage, setOtpMessage] = useState<string>('');
  const [mockOtp, setMockOtp] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  const applyPreset = (type: 'safe' | 'medium' | 'high_value' | 'drain_5m' | 'deficit_5m') => {
    if (type === 'safe') {
      setAmount('450');
      setTxType('PAYMENT');
      setSenderAccount('C109283746');
      setReceiverAccount('M998877665');
      setLocation('Bengaluru');
      setDeviceId('DEV-PHONE-01');
      setDescription('Routine supermarket grocery billing');
      setOldbalanceOrg('40000');
      setStep('14');
    } else if (type === 'medium') {
      setAmount('75000');
      setTxType('TRANSFER');
      setSenderAccount('C332211009');
      setReceiverAccount('C887766554');
      setLocation('Delhi');
      setDeviceId('DEV-LAPTOP-04');
      setDescription('Urgent wire transfer to external contractor');
      setOldbalanceOrg('90000');
      setStep('23');
    } else if (type === 'high_value') {
      setAmount('1000000');
      setTxType('TRANSFER');
      setSenderAccount('C445566778');
      setReceiverAccount('C998877112');
      setLocation('Mumbai');
      setDeviceId('DEV-CORP-DESK');
      setDescription('Authorized commercial vendor settlement wire');
      setOldbalanceOrg('1500000');
      setStep('14');
    } else if (type === 'drain_5m') {
      setAmount('5000000');
      setTxType('TRANSFER');
      setSenderAccount('C776655443');
      setReceiverAccount('C110022998');
      setLocation('Unknown / VPN');
      setDeviceId('UNVERIFIED-DEV-X');
      setDescription('Urgent crypto p2p liquidation fee payout immediate');
      setOldbalanceOrg('5000000');
      setStep('2');
    } else if (type === 'deficit_5m') {
      setAmount('5000000');
      setTxType('TRANSFER');
      setSenderAccount('C998811223');
      setReceiverAccount('C554433221');
      setLocation('Kolkata');
      setDeviceId('DEV-MOBILE-ROAM');
      setDescription('High value unauthorized deficit transfer attempt');
      setOldbalanceOrg('50000');
      setStep('14');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setOtpMessage('');
    setMockOtp('');

    try {
      const payload: Partial<Transaction> = {
        amount: parseFloat(amount),
        tx_type: txType as any,
        sender_account: senderAccount,
        receiver_account: receiverAccount,
        location: location || undefined,
        device_id: deviceId || undefined,
        description: description || undefined,
        oldbalance_org: parseFloat(oldbalanceOrg) || undefined,
        newbalance_orig: Math.max(0, (parseFloat(oldbalanceOrg) || 0) - parseFloat(amount)),
        step: parseInt(step) || 1,
      };

      const res = await api.analyzeTransaction(payload);
      setResult(res);
      if (onTransactionComplete) onTransactionComplete(res);

      if (res.decision === 'STEP_UP_AUTH') {
        const otpRes = await api.requestOTP(res.id, 'SMS');
        setOtpMessage(otpRes.message);
        if (otpRes.mock_otp) {
          setMockOtp(otpRes.mock_otp);
          setOtpCode(otpRes.mock_otp); // autofill for convenience in dev mock mode
        }
      }
    } catch (err: any) {
      console.error('Error analyzing transaction:', err);
      alert('Error analyzing transaction. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!result) return;
    setIsVerifyingOtp(true);
    try {
      const verifyRes = await api.verifyOTP(result.id, otpCode);
      alert(verifyRes.message);
      // Refresh status
      const updated = await api.getTransactionDetail(result.id);
      setResult(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset quick buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">Quick-Load Test Scenarios:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset('safe')}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            Safe Small Payment (₹450)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('medium')}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            Medium Risk Off-Hours (₹75k OTP)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('high_value')}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            High Value RTGS (₹10 Lakhs)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('drain_5m')}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-all"
          >
            Massive Drain (₹50 Lakhs &ge;0.70)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('deficit_5m')}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all"
          >
            Deficit Test (₹50 Lakhs from ₹50k)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Panel */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Live Transaction Input</h2>
              <p className="text-xs text-slate-400">
                Submit transactional telemetry for immediate multi-layer ML and multi-agent risk scoring
              </p>
            </div>
            <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-400">
              PaySim Compatible
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Transaction Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="TRANSFER">TRANSFER (Wire / P2P)</option>
                  <option value="CASH_OUT">CASH_OUT (ATM / Cashier)</option>
                  <option value="PAYMENT">PAYMENT (Merchant POS)</option>
                  <option value="DEBIT">DEBIT (Direct Debit)</option>
                  <option value="CASH_IN">CASH_IN (Deposit)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sender Account No <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderAccount}
                  onChange={(e) => setSenderAccount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Receiver Account No <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receiverAccount}
                  onChange={(e) => setReceiverAccount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Hyderabad"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Device ID (Optional)</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="ABC123"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Sender Balance (₹)</label>
                  <div className="flex gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setOldbalanceOrg(amount)}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Set balance equal to transfer amount"
                    >
                      Match Amt
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setOldbalanceOrg(String(Math.round(parseFloat(amount || '0') * 1.5)))}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Set balance to 1.5x transfer amount"
                    >
                      1.5x Amt
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setOldbalanceOrg('50000')}
                      className="text-rose-400 hover:text-rose-300 transition-colors"
                      title="Set low balance for deficit/overdraft test"
                    >
                      Deficit (50k)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={oldbalanceOrg}
                  onChange={(e) => setOldbalanceOrg(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Transaction Description / Memo (NLP Context Classification)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="E.g., Payment for services, urgent wire, crypto purchase..."
              />
            </div>

            {/* Real-time Parameter Insights & Warnings */}
            {parseFloat(amount || '0') > parseFloat(oldbalanceOrg || '0') && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-semibold">Deficit / Overdraft Anomaly Detected:</span> Transfer amount (₹{Number(amount).toLocaleString()}) exceeds sender ledger balance (₹{Number(oldbalanceOrg).toLocaleString()}). This will test unauthorized balance overdraft defense and trigger immediate high-risk multi-agent escalation.
                </div>
              </div>
            )}

            {parseFloat(amount || '0') >= 500000 && parseFloat(amount || '0') <= parseFloat(oldbalanceOrg || '0') && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 flex items-start gap-2.5 text-cyan-300 text-xs">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <span className="font-semibold">High-Value Regulatory Scrutiny:</span> Transfer amount (₹{Number(amount).toLocaleString()}) meets/exceeds RBI high-value transaction monitoring thresholds (₹5,00,000+). Multi-agent consensus will be engaged.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Executing Real-Time Multi-Agent Fraud Defense...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Transaction for Instant Fraud Check</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-time Result Inspection Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Real-Time Decision Output</h3>
              {result && <RiskBadge score={result.final_risk_score} size="lg" />}
            </div>

            {!result && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-2">
                <ShieldAlert className="h-10 w-10 stroke-1 text-slate-600" />
                <p className="text-sm">Submit a transaction to trigger the multi-layer pipeline</p>
                <p className="text-xs text-slate-600">
                  Fast path &le;0.30: Core banking approval (&lt;100ms)
                  <br />
                  Elevated &gt;0.30: Parallel LangGraph agents
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Running Parallel Agentic Analysis</p>
                <p className="text-[11px] text-slate-500">
                  Feature Extraction &rarr; XGBoost &plus; Isolation Forest &rarr; LangGraph &rarr; Evaluator
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Decision Banner */}
                <div
                  className={`rounded-xl p-4 border flex items-start gap-3 ${
                    result.decision === 'APPROVE'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : result.decision === 'STEP_UP_AUTH'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {result.decision === 'APPROVE' && <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />}
                  {result.decision === 'STEP_UP_AUTH' && <KeyRound className="h-5 w-5 mt-0.5 shrink-0" />}
                  {result.decision === 'HUMAN_REVIEW' && <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />}
                  <div>
                    <h4 className="font-semibold text-sm">
                      {result.decision === 'APPROVE' && 'Transaction Approved (Fast Path)'}
                      {result.decision === 'STEP_UP_AUTH' && 'Step-Up Authentication Required (Medium Risk)'}
                      {result.decision === 'HUMAN_REVIEW' && 'Flagged for Human Review (High Risk)'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Status: <span className="font-mono font-bold">{result.status}</span> • Latency:{' '}
                      <span className="font-mono">{result.latency_ms} ms</span>
                    </p>
                  </div>
                </div>

                {/* Core ML Model Breakdown */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>XGBoost Fraud Probability:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {((result.xgboost_prob ?? 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Isolation Forest Anomaly:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {((result.isolation_forest_score ?? 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-800 pt-2 font-medium">
                    <span className="text-slate-300">Initial Aggregated ML Score:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {(result.initial_risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Multi-agent escalation notes if escalated */}
                {result.escalated_to_agents && result.investigation && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
                      <span>LangGraph Multi-Agent Findings</span>
                      <span className="text-[10px] text-emerald-400">4 Agents Paralleled</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">Behavioral Risk:</span>{' '}
                        <span className="font-mono text-slate-200 font-semibold">
                          {(result.investigation.behavioral_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Context Risk:</span>{' '}
                        <span className="font-mono text-slate-200 font-semibold">
                          {(result.investigation.context_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">RAG Policy:</span>{' '}
                        <span className="font-mono text-slate-200 font-semibold">
                          {(result.investigation.rag_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Guardrails:</span>{' '}
                        <span className="font-mono text-emerald-400 font-semibold">
                          {result.investigation.guardrail_status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                      &ldquo;{result.investigation.llm_risk_summary}&rdquo;
                    </p>
                  </div>
                )}

                {/* OTP Verification Box if Medium Risk */}
                {result.status === 'OTP_PENDING' && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <KeyRound className="h-4 w-4" />
                      <span>Step-Up Authentication Required</span>
                    </div>
                    <p className="text-xs text-slate-300">{otpMessage}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm font-mono tracking-widest text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || !otpCode}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                      >
                        {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {result && (
            <div className="pt-4 border-t border-slate-800 text-right">
              <span className="text-[11px] font-mono text-slate-500">Transaction ID: {result.id}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
