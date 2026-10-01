'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { api } from '../../../services/api';

interface DashboardMetrics {
  totalLeads: number;
  totalCampaigns: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  conversions: number;
  leadStatusDistribution: Record<string, number>;
  recentCampaigns: Array<{ _id: string; name: string; status: string; createdAt: string }>;
}

interface Campaign {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface CampaignAnalytics {
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    failed: number;
  };
}

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, CampaignAnalytics['stats']>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      setLoading(true);
      try {
        const [metricsRes, campaignsRes] = await Promise.all([
          api.get<DashboardMetrics>('/dashboard/metrics'),
          api.get<Campaign[]>('/campaigns'),
        ]);
        setMetrics(metricsRes.data);
        setCampaigns(campaignsRes.data);

        // Fetch analytics for each campaign (limit to 10 most recent)
        const recent = campaignsRes.data.slice(0, 10);
        const analyticsMap: Record<string, CampaignAnalytics['stats']> = {};
        await Promise.allSettled(
          recent.map(async (c) => {
            try {
              const res = await api.get<CampaignAnalytics>(`/campaigns/${c._id}/analytics`);
              analyticsMap[c._id] = res.data.stats;
            } catch {
              analyticsMap[c._id] = { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, failed: 0 };
            }
          })
        );
        setCampaignStats(analyticsMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Leads', value: metrics.totalLeads.toLocaleString(), color: 'text-indigo-400', bg: 'from-indigo-600/10 to-indigo-600/5' },
    { label: 'Total Outreach', value: metrics.emailsSent.toLocaleString(), color: 'text-purple-400', bg: 'from-purple-600/10 to-purple-600/5' },
    { label: 'Open Rate', value: `${metrics.openRate}%`, color: 'text-blue-400', bg: 'from-blue-600/10 to-blue-600/5' },
    { label: 'Reply Rate', value: `${metrics.replyRate}%`, color: 'text-pink-400', bg: 'from-pink-600/10 to-pink-600/5' },
    { label: 'Conversions', value: metrics.conversions.toLocaleString(), color: 'text-emerald-400', bg: 'from-emerald-600/10 to-emerald-600/5' },
  ];

  const statusColors: Record<string, string> = {
    New: 'bg-indigo-500',
    Contacted: 'bg-blue-500',
    Replied: 'bg-pink-500',
    Interested: 'bg-purple-500',
    Closed: 'bg-emerald-500',
  };

  const maxStatusVal = Math.max(...Object.values(metrics.leadStatusDistribution), 1);

  const funnelSteps = [
    { label: 'Sent', value: metrics.emailsSent, color: 'bg-indigo-500' },
    { label: 'Opened', value: Math.round(metrics.emailsSent * (metrics.openRate / 100)), color: 'bg-blue-500' },
    { label: 'Replied', value: Math.round(metrics.emailsSent * (metrics.replyRate / 100)), color: 'bg-pink-500' },
    { label: 'Converted', value: metrics.conversions, color: 'bg-emerald-500' },
  ];
  const maxFunnelVal = Math.max(funnelSteps[0].value, 1);

  const campaignStatusColors: Record<string, string> = {
    Draft: 'bg-slate-900/40 text-slate-400 border-slate-800/30',
    Scheduled: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/30',
    Running: 'bg-blue-950/40 text-blue-400 border-blue-800/30',
    Completed: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30',
    Failed: 'bg-red-950/40 text-red-400 border-red-800/30',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Performance overview of your outreach campaigns and leads.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${s.bg} rounded-bl-full opacity-40 blur-lg -z-10`} />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lead Status Distribution */}
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Lead Status Distribution</h2>
          {metrics.totalLeads === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No leads yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.leadStatusDistribution).map(([status, count]) => {
                const pct = Math.round((count / maxStatusVal) * 100);
                const pctOfTotal = metrics.totalLeads > 0 ? Math.round((count / metrics.totalLeads) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-slate-300 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status] || 'bg-slate-400'}`} />
                        {status}
                      </span>
                      <span className="text-slate-400 font-mono">{count} ({pctOfTotal}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${statusColors[status] || 'bg-slate-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Email Funnel */}
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Outbound Email Funnel</h2>
          {metrics.emailsSent === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No emails sent yet.</p>
          ) : (
            <div className="space-y-3">
              {funnelSteps.map((step) => {
                const pct = Math.round((step.value / maxFunnelVal) * 100);
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-slate-300">{step.label}</span>
                      <span className="text-slate-400 font-mono">{step.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${step.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-900">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Campaign Performance</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-xs text-slate-500 p-6 text-center">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Sent</th>
                  <th className="text-right px-4 py-3">Opened</th>
                  <th className="text-right px-4 py-3">Replied</th>
                  <th className="text-right px-4 py-3">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {campaigns.slice(0, 10).map((c) => {
                  const s = campaignStats[c._id];
                  return (
                    <tr key={c._id} className="hover:bg-slate-900/20 transition">
                      <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${campaignStatusColors[c.status] || 'bg-slate-900/40 text-slate-400 border-slate-800/30'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{s?.sent ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{s?.opened ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-pink-400">{s?.replied ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-red-400">{s?.failed ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
