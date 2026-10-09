import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, ArrowRight, Loader2, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('analyst');
  const [password, setPassword] = useState<string>('AnalystPassword123!');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const ok = await login(username, password);
    setIsLoading(false);
    if (ok) {
      navigate('/');
    } else {
      setError('Invalid banking credentials. Please check your username and password.');
    }
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/20">
            <Shield className="h-7 w-7 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SentinelAI Banking Portal</h1>
          <p className="text-xs text-slate-400">Enterprise Multi-Agent Banking Fraud Detection System</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username / Operator ID</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="analyst"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Key className="h-3 w-3" /> Quick Demo Credentials:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('analyst', 'AnalystPassword123!')}
                className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-center text-[11px] hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="block font-medium text-slate-200">Analyst</span>
                <span className="text-[10px] text-slate-500">Tier 1 Ops</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('investigator', 'InvestigatorPassword123!')}
                className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-center text-[11px] hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="block font-medium text-slate-200">Investigator</span>
                <span className="text-[10px] text-slate-500">Forensics</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('admin', 'AdminPassword123!')}
                className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-center text-[11px] hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
              >
                <span className="block font-medium text-slate-200">Admin</span>
                <span className="text-[10px] text-slate-500">Executive</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Compliant with RBI/2017-18/15 &amp; PCI-DSS standards. 100% Open Source Architecture.
        </div>
      </div>
    </div>
  );
};
