import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemHealth } from '../types';
import { Settings, CheckCircle2, Shield, Sliders, Database, Cpu, Bot, RefreshCw, Save } from 'lucide-react';

export const SettingsHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<any>({
    initial_risk_threshold: 0.30,
    low_risk_threshold: 0.30,
    high_risk_threshold: 0.70,
    mock_otp_mode: true,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const loadData = async () => {
    try {
      const [hData, sData] = await Promise.all([
        api.getHealth(),
        api.getSettings()
      ]);
      setHealth(hData);
      setSettings(sData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      await api.updateSettings({
        initial_risk_threshold: parseFloat(settings.initial_risk_threshold),
        low_risk_threshold: parseFloat(settings.low_risk_threshold),
        high_risk_threshold: parseFloat(settings.high_risk_threshold),
        mock_otp_mode: Boolean(settings.mock_otp_mode),
      });
      setSaveMessage('System policy thresholds and settings updated successfully.');
    } catch {
      alert('Error updating system settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-slate-100">System Health &amp; Risk Policy Configuration</h1>
        </div>
        <p className="text-xs text-slate-400">
          Monitor microservice health, inspect active ML model states, and configure fraud thresholds
        </p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">API Gateway</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-400">
            {health?.status || 'HEALTHY'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">FastAPI v0.136.1</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Database Storage</span>
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-400">
            {health?.database || 'CONNECTED'}
          </p>
          <span className="text-[10px] text-slate-500">SQLAlchemy + pgvector</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Core ML Models</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-400">
            {health?.xgboost_model_loaded && health?.isolation_forest_loaded ? 'LOADED' : 'READY'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">XGBoost &plus; IsoForest</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Multi-Agent Engine</span>
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold font-mono text-emerald-400">
            {health?.agents_ready ? 'OPERATIONAL' : 'READY'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">LangGraph 1.2.9</span>
        </div>
      </div>

      {/* Thresholds & Policy Adjustment Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm max-w-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
          <Sliders className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100">Configurable Decision Policy Thresholds</h2>
        </div>

        {saveMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            {saveMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Section 5 Initial Escalation Threshold (&tau;<sub>init</sub>):</span>
              <span className="font-mono text-emerald-400 font-bold">
                {settings.initial_risk_threshold}
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.60"
              step="0.05"
              value={settings.initial_risk_threshold}
              onChange={(e) => setSettings({ ...settings, initial_risk_threshold: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Transactions with initial ML score &le; {settings.initial_risk_threshold} are approved instantly via fast path.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Step-Up Authentication Upper Bound (&tau;<sub>mfa</sub>):</span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.high_risk_threshold}
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.85"
              step="0.05"
              value={settings.high_risk_threshold}
              onChange={(e) => setSettings({ ...settings, high_risk_threshold: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Transactions between {settings.initial_risk_threshold} and {settings.high_risk_threshold} trigger mandatory step-up OTP.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300 block">Mock OTP Development Mode:</span>
              <span className="text-[11px] text-slate-500">
                Dispatches simulated 6-digit OTP codes in UI modal without requiring SMTP credentials
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.mock_otp_mode)}
              onChange={(e) => setSettings({ ...settings, mock_otp_mode: e.target.checked })}
              className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Applying...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
