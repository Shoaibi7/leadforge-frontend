'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth-store';
import { api } from '../../../../services/api';

interface Lead {
  _id: string;
  companyName: string;
  ownerName: string;
  email: string;
  status: string;
  industry?: string;
  country?: string;
}

interface PagedResponse {
  data: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminLeadsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<PagedResponse>(`/admin/leads?page=${p}&limit=20`);
      setLeads(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.role !== 'admin') { router.replace('/dashboard'); return; }
    fetchLeads(page);
  }, [isAuthenticated, isLoading, user, router, page, fetchLeads]);

  const statusColors: Record<string, string> = {
    New: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/30',
    Contacted: 'bg-blue-950/40 text-blue-400 border-blue-800/30',
    Replied: 'bg-pink-950/40 text-pink-400 border-pink-800/30',
    Interested: 'bg-purple-950/40 text-purple-400 border-purple-800/30',
    Closed: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30',
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">All Leads</h1>
        <p className="text-xs text-slate-400 mt-0.5">{total} leads across all accounts</p>
      </div>

      <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Industry</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-slate-900/20 transition">
                  <td className="px-4 py-3 font-medium text-white">{lead.companyName}</td>
                  <td className="px-4 py-3 text-slate-300">{lead.ownerName}</td>
                  <td className="px-4 py-3 text-slate-400">{lead.email}</td>
                  <td className="px-4 py-3 text-slate-400">{lead.industry || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${statusColors[lead.status] || 'bg-slate-900/40 text-slate-400 border-slate-800/30'}`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-900 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition">← Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-900 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
