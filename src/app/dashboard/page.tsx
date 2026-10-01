'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import Link from 'next/link';

interface DashboardMetrics {
  totalLeads: number;
  totalCampaigns: number;
  emailsSent: number;
  openRate: number;
  replyRate: number;
  conversions: number;
  leadStatusDistribution: {
    New: number;
    Contacted: number;
    Replied: number;
    Interested: number;
    Closed: number;
  };
  recentCampaigns: Array<{
    _id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await api.get<DashboardMetrics>('/dashboard/metrics');
        setMetrics(response.data);
      } catch (err: any) {
        console.error('Error fetching dashboard metrics', err);
        setError('Failed to load dashboard metrics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-800/40 rounded-2xl text-center max-w-xl mx-auto my-12">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-slate-300 font-medium">{error || 'Failed to load metrics'}</p>
      </div>
    );
  }

  // Calculate maximum lead count for chart scaling
  const statusValues = Object.values(metrics.leadStatusDistribution);
  const maxStatusVal = Math.max(...statusValues, 1); // Avoid division by zero

  const stats = [
    {
      name: 'Total Leads',
      value: metrics.totalLeads.toLocaleString(),
      change: 'Active CRM',
      icon: (
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'from-indigo-600/10 to-indigo-600/5',
    },
    {
      name: 'Total Campaigns',
      value: metrics.totalCampaigns.toLocaleString(),
      change: 'All time campaigns',
      icon: (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      color: 'from-blue-600/10 to-blue-600/5',
    },
    {
      name: 'Emails Sent',
      value: metrics.emailsSent.toLocaleString(),
      change: `Open Rate: ${metrics.openRate}%`,
      icon: (
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-purple-600/10 to-purple-600/5',
    },
    {
      name: 'Reply Rate',
      value: `${metrics.replyRate}%`,
      change: `Outbound success`,
      icon: (
        <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      color: 'from-pink-600/10 to-pink-600/5',
    },
    {
      name: 'Conversions',
      value: metrics.conversions.toLocaleString(),
      change: 'Leads Closed',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-emerald-600/10 to-emerald-600/5',
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-xs text-slate-400">Track and manage your AI outreach stats, leads, and active campaigns.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 relative overflow-hidden transition-all duration-300 hover:border-slate-800 hover:-translate-y-0.5 group`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.color} rounded-bl-full opacity-40 blur-lg -z-10 group-hover:scale-110 transition duration-500`}></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</span>
              <div className="p-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart Card */}
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Leads Distribution</h3>
          
          {metrics.totalLeads === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-500">
              <svg className="w-10 h-10 mb-2.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs">No leads added yet. Import a CSV or scrape leads to start.</p>
            </div>
          ) : (
            <div className="space-y-3 py-0.5">
              {Object.entries(metrics.leadStatusDistribution).map(([status, count]) => {
                const percentage = Math.round((count / maxStatusVal) * 100);
                const pctOfTotal = metrics.totalLeads > 0 ? Math.round((count / metrics.totalLeads) * 100) : 0;
                
                const statusColors: Record<string, string> = {
                  New: 'bg-indigo-500',
                  Contacted: 'bg-blue-500',
                  Replied: 'bg-pink-500',
                  Interested: 'bg-purple-500',
                  Closed: 'bg-emerald-500',
                };

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status] || 'bg-slate-400'}`}></span>
                        {status}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {count} <span className="text-[9px] text-slate-650">({pctOfTotal}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-950">
                      <div
                        className={`h-full ${statusColors[status] || 'bg-slate-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outbound Funnel Card */}
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Outbound Funnel</h3>
          {metrics.emailsSent === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-500">
              <svg className="w-10 h-10 mb-2.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-4.796a2 2 0 011.99 0l8 4.796A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2 0l-2.25 1.5" />
              </svg>
              <p className="text-[11px] text-center text-slate-650">No emails sent yet. Start a campaign to track funnel performance.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px]">
              <svg width="100%" height="170" viewBox="0 0 400 170" className="overflow-visible select-none">
                <defs>
                  <linearGradient id="grad-sent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="grad-open" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="grad-reply" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="grad-conv" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Sent Section */}
                <polygon points="40,5 360,5 325,40 75,40" fill="url(#grad-sent)" className="transition duration-300 hover:opacity-90 cursor-pointer" />
                <text x="200" y="25" textAnchor="middle" fill="#fff" className="text-[10px] font-bold font-mono">
                  Sent: {metrics.emailsSent}
                </text>

                {/* Opened Section */}
                <polygon points="79,44 321,44 286,79 114,79" fill="url(#grad-open)" className="transition duration-300 hover:opacity-90 cursor-pointer" />
                <text x="200" y="64" textAnchor="middle" fill="#fff" className="text-[10px] font-bold font-mono">
                  Opened: {Math.round(metrics.emailsSent * (metrics.openRate / 100))} ({metrics.openRate}%)
                </text>

                {/* Replied Section */}
                <polygon points="118,83 282,83 247,118 153,118" fill="url(#grad-reply)" className="transition duration-300 hover:opacity-90 cursor-pointer" />
                <text x="200" y="103" textAnchor="middle" fill="#fff" className="text-[10px] font-bold font-mono">
                  Replied: {Math.round(metrics.emailsSent * (metrics.replyRate / 100))} ({metrics.replyRate}%)
                </text>

                {/* Conversions Section */}
                <polygon points="157,122 243,122 223,157 177,157" fill="url(#grad-conv)" className="transition duration-300 hover:opacity-90 cursor-pointer" />
                <text x="200" y="142" textAnchor="middle" fill="#fff" className="text-[10px] font-bold font-mono">
                  Wins: {metrics.conversions}
                </text>
              </svg>
            </div>
          )}
        </div>

        {/* Recent Campaigns Card */}
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Recent Campaigns</h3>

          {metrics.recentCampaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-6">
              <svg className="w-10 h-10 mb-2.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs mb-3 text-center">You haven&apos;t created any campaigns yet.</p>
              <Link
                href="/dashboard/campaigns"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-2.5 rounded-md text-[10px] transition duration-200"
              >
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="flex-grow space-y-2.5">
              {metrics.recentCampaigns.map((campaign) => (
                <div
                  key={campaign._id}
                  className="flex items-center justify-between p-3 bg-[#121422]/40 border border-slate-900 rounded-lg hover:border-slate-800 transition duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{campaign.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Created: {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    campaign.status === 'Completed' 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' 
                      : campaign.status === 'Running'
                        ? 'bg-blue-950/40 text-blue-400 border border-blue-800/30'
                        : campaign.status === 'Scheduled'
                          ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/30'
                          : campaign.status === 'Failed'
                            ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                            : 'bg-slate-900/40 text-slate-400 border border-slate-800/30'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
              ))}
              <div className="pt-1 text-center">
                <Link
                  href="/dashboard/campaigns"
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition duration-200"
                >
                  View all campaigns &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
