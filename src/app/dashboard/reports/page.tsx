'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../../store/auth-store';
import { api } from '../../../services/api';

interface SeoData {
  title: string;
  metaTags: { name: string; content: string }[];
  headings: { h1: string[]; h2: string[] };
  mobileFriendly: boolean;
  performanceIndicators: { loadTimeMs: number; totalWeightKb: number };
}

interface Report {
  _id: string;
  websiteUrl: string;
  seo: SeoData;
  aiAnalysis: string;
  createdAt: string;
}

interface PagedResponse {
  data: Report[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ReportsPage() {
  const { isAuthenticated } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchReports = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<PagedResponse>(`/reports?page=${p}&limit=10`);
      setReports(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchReports(page);
  }, [isAuthenticated, page, fetchReports]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await api.delete(`/reports/${id}`);
      fetchReports(page);
    } catch (err) {
      console.error(err);
    }
  };

  const parseAnalysis = (raw: string) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Report History</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} saved website analysis reports</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl p-10 text-center">
          <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs text-slate-400">No reports yet. Run the Website Analyzer to generate your first report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const analysis = parseAnalysis(report.aiAnalysis);
            const isOpen = expanded === report._id;

            return (
              <div key={report._id} className="bg-[#0d0f1a]/50 border border-slate-900 rounded-xl overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-900/20 transition"
                  onClick={() => setExpanded(isOpen ? null : report._id)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{report.websiteUrl}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {analysis?.businessName && <span className="mr-2 text-slate-300">{analysis.businessName}</span>}
                      {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(report._id); }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-medium transition">
                      Delete
                    </button>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isOpen && (
                  <div className="border-t border-slate-900 px-4 py-4 space-y-4">
                    {/* SEO Data */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SEO Data</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px]">Page Title</p>
                          <p className="text-slate-200">{report.seo?.title || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">Mobile Friendly</p>
                          <span className={`text-[10px] font-bold ${report.seo?.mobileFriendly ? 'text-emerald-400' : 'text-red-400'}`}>
                            {report.seo?.mobileFriendly ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">Load Time</p>
                          <p className="text-slate-200">{report.seo?.performanceIndicators?.loadTimeMs ? `${report.seo.performanceIndicators.loadTimeMs}ms` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">Page Weight</p>
                          <p className="text-slate-200">{report.seo?.performanceIndicators?.totalWeightKb ? `${report.seo.performanceIndicators.totalWeightKb} KB` : '—'}</p>
                        </div>
                        {report.seo?.headings?.h1?.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-slate-500 text-[10px]">H1 Headings</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {report.seo.headings.h1.slice(0, 5).map((h, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {analysis && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Analysis</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {analysis.businessName && (
                            <div><p className="text-slate-500 text-[10px]">Business</p><p className="text-slate-200">{analysis.businessName}</p></div>
                          )}
                          {analysis.targetAudience && (
                            <div><p className="text-slate-500 text-[10px]">Target Audience</p><p className="text-slate-200">{analysis.targetAudience}</p></div>
                          )}
                          {analysis.valueProposition && (
                            <div className="sm:col-span-2"><p className="text-slate-500 text-[10px]">Value Proposition</p><p className="text-slate-200">{analysis.valueProposition}</p></div>
                          )}
                          {analysis.suggestedOutreach && (
                            <div className="sm:col-span-2">
                              <p className="text-slate-500 text-[10px]">Suggested Outreach</p>
                              <p className="text-indigo-300 italic">{analysis.suggestedOutreach}</p>
                            </div>
                          )}
                          {analysis.services?.length > 0 && (
                            <div className="sm:col-span-2">
                              <p className="text-slate-500 text-[10px]">Services</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {analysis.services.map((s: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-800/30 rounded text-[10px] text-indigo-300">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {analysis.painPoints?.length > 0 && (
                            <div className="sm:col-span-2">
                              <p className="text-slate-500 text-[10px]">Pain Points</p>
                              <ul className="mt-1 space-y-0.5">
                                {analysis.painPoints.map((p: string, i: number) => (
                                  <li key={i} className="text-slate-300 flex gap-1.5"><span className="text-red-400">•</span>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
