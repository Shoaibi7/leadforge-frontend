'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth-store';
import { api } from '../../../../services/api';

interface AiUsageStats {
  totalRequests: number;
  byType: Record<string, number>;
  byUser: Record<string, number>;
  totalTokens: number;
}

export default function AdminAiUsagePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.role !== 'admin') { router.replace('/dashboard'); return; }
    api.get<AiUsageStats>('/admin/ai-usage')
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    email_generation: 'bg-indigo-500',
    website_analysis: 'bg-purple-500',
    lead_enrichment: 'bg-pink-500',
  };

  const total = stats?.totalRequests || 1;
  const byTypeEntries = Object.entries(stats?.byType || {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">AI Usage</h1>
        <p className="text-xs text-slate-400 mt-0.5">Aggregate AI request statistics across all users.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Requests</p>
          <p className="text-3xl font-bold text-indigo-400">{stats?.totalRequests.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Tokens Used</p>
          <p className="text-3xl font-bold text-purple-400">{stats?.totalTokens.toLocaleString() ?? 0}</p>
        </div>
      </div>

      <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 space-y-4">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Requests by Type</h2>
        {byTypeEntries.length === 0 ? (
          <p className="text-xs text-slate-500">No AI requests recorded yet.</p>
        ) : (
          byTypeEntries.map(([type, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-slate-300 capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${typeColors[type] || 'bg-slate-500'} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Requests by User</h2>
        {Object.keys(stats?.byUser || {}).length === 0 ? (
          <p className="text-xs text-slate-500">No data.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-900">
                <th className="text-left py-2">User ID</th>
                <th className="text-right py-2">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40">
              {Object.entries(stats?.byUser || {}).map(([uid, count]) => (
                <tr key={uid}>
                  <td className="py-2 font-mono text-slate-400 text-[10px]">{uid}</td>
                  <td className="py-2 text-right font-medium text-white">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
