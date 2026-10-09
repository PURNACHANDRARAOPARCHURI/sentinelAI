import React from 'react';
import { Shield, ShieldCheck, Zap, Activity, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20">
          <Shield className="h-5 w-5 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">SentinelAI</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Enterprise Multi-Agent Banking Fraud Defense</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Architecture Badges */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>&lt;1s Latency</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>&ge;80% Detection Target</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>100% Open Source</span>
          </div>
        </div>

        {/* User profile */}
        {user ? (
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <User className="h-4 w-4" />
              </div>
              <div className="text-left text-xs">
                <p className="font-medium text-slate-200">{user.full_name || user.username}</p>
                <p className="capitalize text-emerald-400">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
