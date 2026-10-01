/**
 * BRANDX Admin AI Screen (/admin/ai)
 */

import React, { useEffect, useState } from 'react';
import { aiAnalyticsService } from '../services/aiAnalyticsService';
import { AdminAICopilotMetrics } from '../types';
import { AdminStatCard } from '../components/AdminStatCard';

export const AdminAIScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminAICopilotMetrics | null>(null);
  const [featureDist, setFeatureDist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([aiAnalyticsService.getMetrics(), aiAnalyticsService.getFeatureUsageDistribution()]).then(
      ([m, f]) => {
        setMetrics(m);
        setFeatureDist(f);
        setIsLoading(false);
      }
    );
  }, []);

  if (isLoading || !metrics) {
    return <div className="py-16 text-center text-gray-400">Loading AI analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminStatCard label="Total AI Invocations" value={metrics.totalRequests} icon="auto_awesome" color="purple" />
        <AdminStatCard label="AI Invocations Today" value={metrics.todayRequests} icon="bolt" color="amber" />
        <AdminStatCard label="Voice-to-Bill Audio Transcribes" value={metrics.voiceToBillRequests} icon="mic" color="emerald" />
        <AdminStatCard label="Active AI Vyaparis" value={metrics.activeAiUsers} icon="psychology" color="blue" />
      </div>

      {/* Feature Usage Table & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-base">Copilot Feature Invocations Breakdown</h4>
          <div className="space-y-3 pt-2">
            {featureDist.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{item.feature}</span>
                  <span className="font-mono text-emerald-400 font-bold">{item.count.toLocaleString('en-IN')} calls</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Latency & Health */}
        <div className="lg:col-span-5 bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-base">Gemini Engine SLA &amp; Latency</h4>
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-xs block">Average Response Latency</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                {metrics.averageResponseTimeMs} ms
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">Ultra fast streaming</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-gray-400 text-xs block">Prompt Error Rate</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                {metrics.errorRatePercent}%
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Healthy API limits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
