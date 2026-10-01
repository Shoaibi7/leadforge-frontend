'use client';

import React, { useState } from 'react';
import { api } from '../../../services/api';

export default function ScraperPage() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [jobResult, setJobResult] = useState<{ message: string; jobId: string | number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLaunchScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setJobResult(null);

    try {
      const response = await api.post('/ai/scrape-maps', {
        query,
        limit,
      });
      setJobResult({
        message: response.data?.message || 'Outreach scraping job successfully queued in background.',
        jobId: response.data?.jobId,
      });
      setQuery('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to trigger Maps scraper.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Google Maps Lead Scraper</h1>
        <p className="text-sm text-slate-400 mt-1">
          Automate local business lead generation by scraping Google Maps listings directly into your CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Scraper Configuration Form */}
        <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Scraper settings</h2>
          
          <form onSubmit={handleLaunchScrape} className="space-y-4">
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Search Query *
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Coffee shops in Austin"
                className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                  Max Listings limit
                </label>
                <span className="text-xs font-semibold text-indigo-400">{limit} leads</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                disabled={loading}
              />
              <div className="flex justify-between text-3xs text-slate-600 px-1 mt-1">
                <span>5</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !query}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Launching Scraper...</span>
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Launch Search Crawl</span>
                </>
              )}
            </button>
          </form>

          {jobResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs space-y-1.5">
              <p>🎉 {jobResult.message}</p>
              {jobResult.jobId && (
                <p className="text-3xs text-slate-400 font-mono">
                  Job ID: <span className="text-emerald-400">{jobResult.jobId}</span>
                </p>
              )}
              <p className="text-3xs text-slate-400">
                The crawling process runs in the background. A notification alert will post to the dashboard feed upon completion.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs">
              <span>❌ {error}</span>
            </div>
          )}
        </div>

        {/* Detailed Scraper Checklist Explanation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">How the Scraping & Enrichment Pipeline Works</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#07080d]/40 p-4 border border-slate-950 rounded-xl flex gap-3">
                <span className="text-xl">🔍</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Maps Search Query</h4>
                  <p className="text-3xs text-slate-400 mt-1 leading-relaxed">
                    Playwright launches a headless Chromium instance navigating to Google Maps to feed the target search term.
                  </p>
                </div>
              </div>

              <div className="bg-[#07080d]/40 p-4 border border-slate-950 rounded-xl flex gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Scrolling & Feed Scraping</h4>
                  <p className="text-3xs text-slate-400 mt-1 leading-relaxed">
                    Automatically scrolls down the search results pane to fetch elements up to your limit threshold.
                  </p>
                </div>
              </div>

              <div className="bg-[#07080d]/40 p-4 border border-slate-950 rounded-xl flex gap-3">
                <span className="text-xl">📞</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Details Extraction</h4>
                  <p className="text-3xs text-slate-400 mt-1 leading-relaxed">
                    Clicks each listing to extract Name, Phone, Website domain, and physical Address.
                  </p>
                </div>
              </div>

              <div className="bg-[#07080d]/40 p-4 border border-slate-950 rounded-xl flex gap-3">
                <span className="text-xl">🌐</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Email Enrichment Crawling</h4>
                  <p className="text-3xs text-slate-400 mt-1 leading-relaxed">
                    Visits the target's website and crawls homepage and contact pages to search for public emails using regex filters.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-2xs text-slate-500">
                Leads are saved directly in your CRM leads list as new entries.
              </span>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.href = '/dashboard/leads';
                }}
                className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Navigate to CRM Leads</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
