import React from 'react';

interface RiskBadgeProps {
  score: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, showText = true, size = 'md' }) => {
  const percent = Math.round(score * 100);
  
  let colorBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let label = 'Low Risk';

  if (score >= 0.70) {
    colorBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    label = 'High Risk (Flagged)';
  } else if (score >= 0.30) {
    colorBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    label = 'Medium (Step-Up)';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-medium'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${colorBg} ${sizeClasses[size]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${score >= 0.70 ? 'bg-rose-500 animate-pulse' : score >= 0.30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      <span>{percent}%</span>
      {showText && <span className="opacity-80">({label})</span>}
    </span>
  );
};
