/**
 * BRANDX Admin Stat Card
 * Metric summary card with change indicator and icon badge.
 */

import React from 'react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: string;
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';
  subtext?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  color = 'emerald',
  subtext,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300',
    },
    blue: {
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      badge: 'bg-blue-500/15 text-blue-300',
    },
    purple: {
      bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      badge: 'bg-purple-500/15 text-purple-300',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      badge: 'bg-amber-500/15 text-amber-300',
    },
    rose: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      badge: 'bg-rose-500/15 text-rose-300',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-white/20 transition-all hover:translate-y-[-2px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 truncate">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${scheme.bg} shrink-0`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
          {change && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                isPositive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {isPositive ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {change}
            </span>
          )}
        </div>
        {subtext && <p className="text-[11px] text-gray-400 mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );
};
