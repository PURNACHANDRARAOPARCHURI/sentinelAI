import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  SendHorizontal,
  Search,
  AlertTriangle,
  Bot,
  History,
  BarChart3,
  Cpu,
  UserCheck,
  Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Main Dashboard', icon: LayoutDashboard },
  { path: '/submit', label: 'Submit Transaction', icon: SendHorizontal },
  { path: '/transaction-analysis', label: 'Transaction Analysis', icon: Search },
  { path: '/fraud-investigation', label: 'Fraud Investigation', icon: AlertTriangle },
  { path: '/multi-agent', label: 'Multi-Agent Analysis', icon: Bot },
  { path: '/history', label: 'Historical Ledger', icon: History },
  { path: '/risk-analytics', label: 'Risk Analytics', icon: BarChart3 },
  { path: '/model-performance', label: 'Model Performance', icon: Cpu },
  { path: '/human-review', label: 'Human Review Queue', icon: UserCheck },
  { path: '/settings', label: 'System Health & Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation Modules
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Defense Architecture</p>
        <p className="text-[11px] text-slate-500">
          XGBoost + Isolation Forest + 4 LangGraph Agents + Open Evaluator
        </p>
      </div>
    </aside>
  );
};
