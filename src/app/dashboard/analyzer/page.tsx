'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../services/api';

interface AnalysisResult {
  businessName: string;
  services: string[];
  targetAudience: string;
  valueProposition: string;
  painPoints: string[];
  suggestedOutreach: string;
}

interface SeoData {
  title: string;
  metaTags: { name: string; content: string }[];
  headings: { h1: string[]; h2: string[] };
  mobileFriendly: boolean;
  performanceIndicators: { loadTimeMs: number; totalWeightKb: number };
}

interface EnhancedAnalysisResult extends AnalysisResult {
  seo?: SeoData;
  websiteUrl?: string;
}

export default function AnalyzerPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<EnhancedAnalysisResult | null>(null);
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Launching headless browser connection...',
    'Navigating to website and bypassing headers...',
    'Extracting semantic text blocks from homepage body...',
    'Feeding text tokens to Gemini LLM for value analysis...',
    'Structuring business profile data...',
  ];

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSeoData(null);
    setCurrentStep(0);

    // Simulate stepping through loader milestones
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    try {
      const response = await api.post('/ai/analyze-website', { url });
      setResult({ ...response.data, websiteUrl: url });
      if (response.data.seo) setSeoData(response.data.seo);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze the website. Please check the URL and try again.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Website Analyzer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Scrape and analyze business websites using Gemini AI to identify services, value propositions, and pain points.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* URL Input Form */}
        <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Target Domain</h2>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://acme.com"
                className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !url}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Analyze Domain</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex gap-2">
              <span>❌ {error}</span>
            </div>
          )}
        </div>

        {/* Results / Loader Content */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <div className="relative">
                <svg className="animate-spin h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-indigo-400">
                  AI
                </div>
              </div>

              <div className="w-full max-w-md space-y-3">
                <p className="text-center text-sm font-semibold text-white">Crawling & Extracting Business Model...</p>
                <div className="space-y-2 pt-2 border-t border-slate-900/60">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs">
                      {idx < currentStep ? (
                        <span className="text-emerald-500 font-bold">✓</span>
                      ) : idx === currentStep ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                      )}
                      <span className={idx === currentStep ? 'text-indigo-400 font-medium' : idx < currentStep ? 'text-slate-400' : 'text-slate-600'}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-[#0e1124] to-[#090b14] border border-slate-900 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <div>
                  <span className="text-4xs font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 rounded-full px-2.5 py-1 uppercase tracking-widest font-mono">
                    AI Business Profile
                  </span>
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300 tracking-tight mt-2.5">
                    {result.businessName}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-950/60">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Audience:</h4>
                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">{result.targetAudience}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Core Value Proposition:</h4>
                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">{result.valueProposition}</p>
                  </div>
                </div>
              </div>

              {/* services and pain points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Services Card */}
                <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Products & Services</span>
                  </h3>
                  <ul className="space-y-2">
                    {result.services.map((srv, idx) => (
                      <li key={idx} className="flex gap-2 text-xs text-slate-300 leading-relaxed bg-[#07080d]/40 p-2.5 rounded-xl border border-slate-950">
                        <span className="text-indigo-400 font-semibold">•</span>
                        <span>{srv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pain Points Card */}
                <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Client Pain Points</span>
                  </h3>
                  <ul className="space-y-2">
                    {result.painPoints.map((pt, idx) => (
                      <li key={idx} className="flex gap-2 text-xs text-slate-300 leading-relaxed bg-[#07080d]/40 p-2.5 rounded-xl border border-slate-950">
                        <span className="text-pink-400 font-semibold">⚠️</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Outreach suggestion card */}
              <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-2xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4.5 h-4.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>Suggested Pitch / Outreach Strategy</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#07080d]/50 p-4 rounded-xl border border-slate-950">
                  {result.suggestedOutreach}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        // Store strategy context in session memory to read inside templates creator modal
                        sessionStorage.setItem('ai_analyzer_context', JSON.stringify({
                          businessName: result.businessName,
                          valueProposition: result.valueProposition,
                          suggestedOutreach: result.suggestedOutreach
                        }));
                        window.location.href = '/dashboard/templates';
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3 rounded-lg text-[11px] shadow-lg shadow-indigo-500/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Write Outreach Email &rarr;</span>
                  </button>
                </div>
              </div>

              {/* SEO Data Section */}
              {seoData && (
                <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>SEO Data</span>
                  </h3>

                  {/* Performance Indicators + Mobile Friendliness */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#07080d]/40 border border-slate-950 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Mobile Friendliness</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${seoData.mobileFriendly ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' : 'bg-red-950/40 text-red-400 border-red-800/30'}`}>
                        {seoData.mobileFriendly ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </div>
                    <div className="bg-[#07080d]/40 border border-slate-950 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Load Time</p>
                      <p className="text-sm font-bold text-white">{seoData.performanceIndicators.loadTimeMs > 0 ? `${seoData.performanceIndicators.loadTimeMs}ms` : '—'}</p>
                    </div>
                    <div className="bg-[#07080d]/40 border border-slate-950 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Page Weight</p>
                      <p className="text-sm font-bold text-white">{seoData.performanceIndicators.totalWeightKb > 0 ? `${seoData.performanceIndicators.totalWeightKb} KB` : '—'}</p>
                    </div>
                  </div>

                  {/* Page Title */}
                  {seoData.title && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Page Title</p>
                      <p className="text-xs text-slate-300 bg-[#07080d]/40 border border-slate-950 rounded-xl p-2.5">{seoData.title}</p>
                    </div>
                  )}

                  {/* Meta Description */}
                  {(() => {
                    const metaDesc = seoData.metaTags?.find(
                      (t) => t.name === 'description' || t.name === 'og:description'
                    )?.content;
                    return metaDesc ? (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Meta Description</p>
                        <p className="text-xs text-slate-300 bg-[#07080d]/40 border border-slate-950 rounded-xl p-2.5 leading-relaxed">{metaDesc}</p>
                      </div>
                    ) : null;
                  })()}

                  {/* H1 Headings */}
                  {seoData.headings.h1.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">H1 Headings</p>
                      <div className="flex flex-wrap gap-1.5">
                        {seoData.headings.h1.slice(0, 6).map((h, i) => (
                          <span key={i} className="px-2.5 py-1 bg-blue-950/30 border border-blue-800/20 rounded-lg text-[10px] text-blue-300">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* H2 Headings */}
                  {seoData.headings.h2.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">H2 Headings</p>
                      <div className="flex flex-wrap gap-1.5">
                        {seoData.headings.h2.slice(0, 8).map((h, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View Report History link */}
              <div className="flex justify-end">
                <Link href="/dashboard/reports"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Report History →
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-[#0d0f1a]/20 border border-slate-900 rounded-2xl py-24 text-center text-slate-500">
              <svg className="w-12 h-12 text-slate-700 mx-auto mb-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-400">Ready for Analysis</p>
              <p className="text-xs text-slate-600 mt-1">Enter a business URL on the left panel to crawl and synthesize company insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
