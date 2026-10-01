'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../../services/api';

interface Template {
  _id: string;
  name: string;
  body: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // AI outreach assistant states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<{ subject: string; body: string; followUp?: string } | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setAiError(null);
    setAiGenerating(true);
    try {
      const res = await api.post('/ai/generate-email', { prompt: aiPrompt });
      setAiResult(res.data);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to generate outreach email');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiGeneration = () => {
    if (!aiResult) return;
    setFormBody(aiResult.body);
    setShowAiModal(false);
    setAiPrompt('');
    setAiResult(null);
  };

  const handleApplyFollowUp = () => {
    if (!aiResult?.followUp) return;
    setFormBody(aiResult.followUp);
    setShowAiModal(false);
    setAiPrompt('');
    setAiResult(null);
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ai_analyzer_context');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setAiPrompt(`Write a personalized cold email targeting ${parsed.businessName}.\n\nCompany Profile/Context:\n- Value Prop: ${parsed.valueProposition}\n- Suggested pitch: ${parsed.suggestedOutreach}`);
          setShowAiModal(true);
          setShowModal(true);
          setFormName(`${parsed.businessName} Cold Outreach`);
          sessionStorage.removeItem('ai_analyzer_context');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormBody('');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormBody(template.body);
    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormName('');
    setFormBody('');
    setFormError(null);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSaving(true);

    // Auto-detect placeholders in body for variables list
    const regex = /\{\{([^}]+)\}\}/g;
    const foundTags: string[] = [];
    let match;
    while ((match = regex.exec(formBody)) !== null) {
      const tag = match[1].trim();
      if (!foundTags.includes(tag)) {
        foundTags.push(tag);
      }
    }

    const payload = {
      name: formName,
      body: formBody,
      variables: foundTags,
    };

    try {
      if (editingTemplate) {
        await api.patch(`/templates/${editingTemplate._id}`, payload);
      } else {
        await api.post('/templates', payload);
      }
      handleCloseModal();
      fetchTemplates();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save template';
      setFormError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  const insertPlaceholder = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = formBody;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const tagText = `{{${tag}}}`;
    setFormBody(before + tagText + after);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + tagText.length;
        textareaRef.current.selectionEnd = start + tagText.length;
      }
    }, 50);
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Templates</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create reusable templates with dynamic interpolation brackets for campaigns.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Template</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-4">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Loading templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-[#0d0f1a]/20 border border-slate-900 rounded-2xl py-16 text-center text-slate-500">
          <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">No templates found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first template to start an outreach campaign.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition duration-200 flex flex-col justify-between group h-[280px]"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="font-bold text-white group-hover:text-indigo-400 transition truncate text-base">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEdit(template)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer"
                      title="Edit"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template._id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg cursor-pointer"
                      title="Delete"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-xs line-clamp-6 leading-relaxed bg-[#07080d]/40 rounded-xl p-3 border border-slate-950 font-mono overflow-hidden h-[130px]">
                  {template.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-950">
                {template.variables && template.variables.length > 0 ? (
                  template.variables.map((v) => (
                    <span
                      key={v}
                      className="bg-indigo-950/30 text-indigo-400 border border-indigo-900/30 rounded-full px-2 py-0.5 text-3xs font-medium uppercase font-mono"
                    >
                      {v}
                    </span>
                  ))
                ) : (
                  <span className="text-3xs text-slate-600 italic">No placeholders detected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATE EDITOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-900/60 bg-[#0d0f1a]/40 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-900 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-red-950/30 border border-red-800/50 text-red-300 rounded-xl text-xs flex items-center gap-2.5">
                  <svg className="w-4.5 h-4.5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Cold Outreach Initial Hook"
                  className="w-full bg-[#07080d]/60 border border-slate-800/80 rounded-lg py-2.5 px-3.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition duration-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Template Content (HTML / Plain text) *
                </label>
                
                {/* IDE-like Editor Container */}
                <div className="border border-slate-800 rounded-lg overflow-hidden focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/25 transition duration-200">
                  {/* Editor Header Toolbar */}
                  <div className="bg-[#111324] border-b border-slate-850 px-3.5 py-2 flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: AI Assistant Button */}
                    <button
                      type="button"
                      onClick={() => setShowAiModal(true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-2.5 py-1.5 rounded text-3xs tracking-wider uppercase transition duration-200 cursor-pointer flex items-center gap-1 shadow-md shadow-purple-500/10"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <span>AI Writer</span>
                    </button>

                    {/* Right: Placeholders Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-3xs text-slate-500 mr-0.5">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('ownerName')}
                        className="bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 hover:border-indigo-500/35 font-mono px-2 py-1 rounded text-3xs transition duration-150 cursor-pointer"
                        title="Click to insert"
                      >
                        &#123;&#123;ownerName&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('companyName')}
                        className="bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 hover:border-indigo-500/35 font-mono px-2 py-1 rounded text-3xs transition duration-150 cursor-pointer"
                        title="Click to insert"
                      >
                        &#123;&#123;companyName&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('industry')}
                        className="bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 hover:border-indigo-500/35 font-mono px-2 py-1 rounded text-3xs transition duration-150 cursor-pointer"
                        title="Click to insert"
                      >
                        &#123;&#123;industry&#125;&#125;
                      </button>
                    </div>
                  </div>

                  {/* Textarea Area */}
                  <textarea
                    ref={textareaRef}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Hello {{ownerName}},&#10;&#10;I noticed {{companyName}} is doing incredible things in the {{industry}} sector..."
                    rows={12}
                    className="w-full bg-[#07080d]/80 px-3.5 py-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none font-mono leading-relaxed resize-y"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-end gap-3 bg-[#0d0f1a]/20">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-slate-900/40 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  {formSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI OUTREACH WRITER MODAL OVERLAY */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/65 z-55 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0d0f1a] border border-purple-950/40 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-900 flex items-center justify-between bg-purple-950/10">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Copywriter Assistant</h3>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setAiResult(null);
                  setAiPrompt('');
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {aiError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs">
                  <span>❌ {aiError}</span>
                </div>
              )}

              {!aiResult ? (
                <form onSubmit={handleGenerateEmail} className="space-y-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Describe the email outreach goal *
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. Write a cold outreach email pitching our software development consulting services to tech startups. Keep it under 150 words and focus on speed of delivery."
                      rows={4}
                      className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-purple-500 transition"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiModal(false);
                        setAiPrompt('');
                      }}
                      className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={aiGenerating || !aiPrompt}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-purple-500/10 transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      {aiGenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Generating copy...</span>
                        </>
                      ) : (
                        <span>Generate with Gemini</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Suggested Subject Line (Copy for Campaign setup)
                    </label>
                    <input
                      type="text"
                      value={aiResult.subject}
                      readOnly
                      className="w-full bg-[#07080d] border border-slate-900 rounded-xl py-2 px-3.5 text-xs text-indigo-400 font-semibold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Suggested Email Template Body
                    </label>
                    <textarea
                      value={aiResult.body}
                      readOnly
                      rows={8}
                      className="w-full bg-[#07080d] border border-slate-900 rounded-xl py-3 px-4 text-xs text-slate-300 font-mono leading-relaxed"
                    />
                  </div>

                  {aiResult.followUp && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                          Follow-up Email (send 3–5 days later if no reply)
                        </label>
                        <button
                          type="button"
                          onClick={handleApplyFollowUp}
                          className="text-2xs text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-900/40 hover:border-indigo-700/50 bg-indigo-950/20 hover:bg-indigo-950/40 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Apply as Template
                        </button>
                      </div>
                      <textarea
                        value={aiResult.followUp}
                        readOnly
                        rows={3}
                        className="w-full bg-[#07080d] border border-indigo-900/30 rounded-xl py-3 px-4 text-xs text-indigo-300 font-mono leading-relaxed"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-900 pt-4">
                    <button
                      type="button"
                      onClick={() => setAiResult(null)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      &larr; Try another prompt
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAiModal(false);
                          setAiResult(null);
                          setAiPrompt('');
                        }}
                        className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAiGeneration}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-purple-500/10 transition duration-200 cursor-pointer"
                      >
                        Apply to Editor
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
