/**
 * BRANDX Admin Interactive Responsive Chart
 * Pure React & SVG charts for user growth, invoices, active users and AI request trends.
 */

import React from 'react';

interface ChartPoint {
  label: string;
  value: number;
}

interface AdminChartProps {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  type?: 'bar' | 'line' | 'donut';
  color?: string;
  valuePrefix?: string;
}

export const AdminChart: React.FC<AdminChartProps> = ({
  title,
  subtitle,
  data,
  type = 'bar',
  color = '#10b981',
  valuePrefix = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-5 text-center text-gray-400">
        No chart data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-sm tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {type === 'bar' && (
        <div className="h-44 w-full flex items-end justify-between gap-2 pt-4">
          {data.map((item, idx) => {
            const heightPercent = Math.round((item.value / maxValue) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                <div className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold bg-[#131b2e] px-1.5 py-0.5 rounded-md border border-white/10 mb-1">
                  {valuePrefix}
                  {item.value.toLocaleString('en-IN')}
                </div>
                <div className="w-full max-w-[32px] bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                  <div
                    style={{
                      height: `${Math.max(8, heightPercent)}%`,
                      backgroundColor: color,
                    }}
                    className="w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                  />
                </div>
                <span className="text-[11px] text-gray-400 font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {type === 'donut' && (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
          <div className="space-y-2 w-full">
            {data.map((item, idx) => {
              const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#38bdf8'];
              const itemColor = colors[idx % colors.length];
              const percent = Math.round((item.value / data.reduce((a, b) => a + b.value, 0)) * 100) || 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: itemColor }} />
                    <span className="text-gray-300 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-white font-bold">{item.value}%</span>
                    <span className="text-gray-400 text-[10px]">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
