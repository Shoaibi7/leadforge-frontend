'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth-store';
import { api } from '../../../../services/api';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface PagedResponse {
  data: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const url = `/admin/users?page=${p}&limit=10${s ? `&search=${encodeURIComponent(s)}` : ''}`;
      const res = await api.get<PagedResponse>(url);
      setUsers(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
      setTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.role !== 'admin') { router.replace('/dashboard'); return; }
    fetchUsers(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user, router, page]);

  const handleRoleToggle = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change ${u.name}'s role to ${newRole}?`)) return;
    try {
      await api.patch(`/admin/users/${u._id}/role`, { role: newRole });
      fetchUsers(page, search);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!window.confirm(`Delete account for ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      fetchUsers(page, search);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Manage Users</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total users</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="bg-[#0d0f1a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-600 w-56"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
            Search
          </button>
        </form>
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
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Verified</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-xs">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-900/20 transition">
                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/30'
                          : 'bg-slate-900/40 text-slate-400 border border-slate-800/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] ${u.isEmailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {u.isEmailVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition"
                      >
                        Make {u.role === 'admin' ? 'User' : 'Admin'}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-[10px] font-medium text-red-400 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-900 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-900 rounded-lg disabled:opacity-40 hover:bg-slate-800 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
