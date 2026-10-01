'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth-store';
import { api } from '../../../services/api';

interface PlatformStats {
  totalUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  totalEmails: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until the auth store has finished restoring the session
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    api.get<PlatformStats>('/admin/stats')
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

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, color: 'from-indigo-600/10 to-indigo-600/5', accent: 'text-indigo-400' },
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, color: 'from-blue-600/10 to-blue-600/5', accent: 'text-blue-400' },
    { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, color: 'from-purple-600/10 to-purple-600/5', accent: 'text-purple-400' },
    { label: 'Total Emails', value: stats?.totalEmails ?? 0, color: 'from-pink-600/10 to-pink-600/5', accent: 'text-pink-400' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        <p className="text-xs text-slate-400 mt-1">Platform-wide statistics and management.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl ${card.color} rounded-bl-full opacity-40 blur-lg -z-10`} />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.accent}`}>{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/admin/users', label: 'Manage Users', desc: 'View, promote, and delete user accounts.' },
          { href: '/dashboard/admin/leads', label: 'All Leads', desc: 'Browse leads across all user accounts.' },
          { href: '/dashboard/admin/campaigns', label: 'All Campaigns', desc: 'Inspect campaigns from every account.' },
          { href: '/dashboard/admin/ai-usage', label: 'AI Usage', desc: 'Review AI request usage by type and user.' },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-4 hover:border-indigo-800/40 transition group">
            <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">{link.label} →</p>
            <p className="text-xs text-slate-400 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
