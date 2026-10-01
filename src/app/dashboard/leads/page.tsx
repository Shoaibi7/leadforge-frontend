'use client';

import React, { useEffect, useState, useRef } from 'react';
import { LeadEmailProvenance } from '../../../components/leads/LeadEmailProvenance';
import { FoundViaSearch, FOUND_VIA_SEARCH_LABEL } from '../../../components/leads/FoundViaSearch';
import { EmailSourceType, confirmEmailMessage, requestConfirmLeadEmail } from '../../../lib/lead-email-provenance';
import { createSingleFlight } from '../../../lib/campaign-status';
import { api } from '../../../services/api';

interface Lead {
  _id: string;
  companyName: string;
  ownerName?: string;
  email?: string;
  emailSourceType?: EmailSourceType;
  emailSourceMethod?: string;
  emailSourceUrl?: string;
  emailOutreachEligible?: boolean;
  phone?: string;
  website?: string;
  industry?: string;
  /** Discovery context: the Maps search that found this lead (not its industry). */
  sourceQuery?: string;
  country?: string;
  city?: string;
  status: 'New' | 'Contacted' | 'Replied' | 'Interested' | 'Closed';
  notes?: string;
  createdAt: string;
}

const cleanScrapedText = (text?: string): string => {
  if (!text) return '';
  return text.trim().replace(/^[^\w\d\s'"(+-]+/, '').trim();
};

export default function LeadsPage() {
  // Leads data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter / Sort / Search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal control states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);
  const [confirmingLeadId, setConfirmingLeadId] = useState<string | null>(null);
  const confirmGuard = useRef(createSingleFlight());

  // "I confirm this contact address": records the user's decision only; nothing is sent.
  const handleConfirmLeadEmail = (lead: Lead) =>
    confirmGuard.current.run(lead._id, async () => {
      if (!lead.email || !confirm(confirmEmailMessage(lead.email, lead.companyName))) return;
      setConfirmingLeadId(lead._id);
      try {
        const result = await requestConfirmLeadEmail(api, lead._id, lead.email);
        if (!result.ok) {
          alert(result.message);
        }
        await fetchLeads();
        if (selectedLeadForView?._id === lead._id) {
          const fresh = await api.get(`/leads/${lead._id}`);
          setSelectedLeadForView(fresh.data);
        }
      } finally {
        setConfirmingLeadId(null);
      }
    });
  const [showViewModal, setShowViewModal] = useState(false);

  // Single Lead form states
  const [formCompany, setFormCompany] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStatus, setFormStatus] = useState<'New' | 'Contacted' | 'Replied' | 'Interested' | 'Closed'>('New');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // CSV file import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressRows, setImportProgressRows] = useState(0);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [importReport, setImportReport] = useState<{
    importedCount: number;
    failedCount: number;
    failedRecords: Array<{ row: number; email: string; reason: string }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Bulk actions status state
  const [bulkStatusToApply, setBulkStatusToApply] = useState('');

  // Fetch CRM leads from API
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leads', {
        params: {
          page,
          limit,
          search: search || undefined,
          status: status || undefined,
          industry: industry || undefined,
          country: country || undefined,
          sortBy,
          sortOrder,
        },
      });
      setLeads(response.data.leads);
      setTotal(response.data.total);
      setTotalPages(response.data.pages);
      setSelectedIds(new Set()); // Reset selections
    } catch (err) {
      console.error('Error fetching leads', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on query changes
  useEffect(() => {
    fetchLeads();
  }, [page, status, industry, country, sortBy, sortOrder]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(leads.map((l) => l._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  // Toggle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Open modal for editing
  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormCompany(lead.companyName);
    setFormOwner(lead.ownerName ?? '');
    setFormEmail(lead.email ?? '');
    setFormPhone(lead.phone || '');
    setFormWebsite(lead.website || '');
    setFormIndustry(lead.industry || '');
    setFormCountry(lead.country || '');
    setFormCity(lead.city || '');
    setFormStatus(lead.status);
    setFormNotes(lead.notes || '');
    setFormError(null);
    setShowAddModal(true);
  };

  // Reset Form states
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLead(null);
    setFormCompany('');
    setFormOwner('');
    setFormEmail('');
    setFormPhone('');
    setFormWebsite('');
    setFormIndustry('');
    setFormCountry('');
    setFormCity('');
    setFormStatus('New');
    setFormNotes('');
    setFormError(null);
  };

  // Create / Update lead handler
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSaving(true);

    const payload = {
      companyName: formCompany,
      ownerName: formOwner,
      email: formEmail,
      phone: formPhone || undefined,
      website: formWebsite || undefined,
      industry: formIndustry || undefined,
      country: formCountry || undefined,
      city: formCity || undefined,
      status: formStatus,
      notes: formNotes || undefined,
    };

    try {
      if (editingLead) {
        await api.patch(`/leads/${editingLead._id}`, payload);
      } else {
        await api.post('/leads', payload);
      }
      handleCloseModal();
      fetchLeads();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save lead details';
      setFormError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setFormSaving(false);
    }
  };

  // Delete lead handler
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  // Bulk status update
  const handleBulkUpdateStatus = async () => {
    if (selectedIds.size === 0 || !bulkStatusToApply) return;
    try {
      await api.post('/leads/bulk-update', {
        ids: Array.from(selectedIds),
        status: bulkStatusToApply,
      });
      fetchLeads();
      setBulkStatusToApply('');
    } catch (err) {
      alert('Failed to perform bulk update');
    }
  };

  // Bulk delete leads
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.size} selected leads?`)) return;
    try {
      await api.post('/leads/bulk-delete', {
        ids: Array.from(selectedIds),
      });
      fetchLeads();
    } catch (err) {
      alert('Failed to bulk delete leads');
    }
  };

  // CSV Drag and drop file select
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setImportReport(null);
      setImportError(null);
    }
  };

  // CSV upload handler
  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setImporting(true);
    setImportError(null);
    setImportReport(null);
    setImportProgress(0);
    setImportProgressRows(0);

    // Estimate total rows from file size (rough: ~80 bytes per row)
    const estimatedRows = Math.max(1, Math.round(csvFile.size / 80));
    setImportTotalRows(estimatedRows);

    // Simulate incremental progress during upload
    let currentProgress = 0;
    let currentRows = 0;
    const progressInterval = setInterval(() => {
      if (currentProgress < 85) {
        const increment = Math.random() * 8 + 2;
        currentProgress = Math.min(85, currentProgress + increment);
        currentRows = Math.round((currentProgress / 100) * estimatedRows);
        setImportProgress(Math.round(currentProgress));
        setImportProgressRows(currentRows);
      }
    }, 300);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await api.post('/leads/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportProgressRows(estimatedRows);
      // Brief pause at 100% before showing report
      await new Promise((resolve) => setTimeout(resolve, 500));
      setImportReport(response.data);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchLeads();
    } catch (err: any) {
      clearInterval(progressInterval);
      setImportError(err.response?.data?.message || 'Failed to import CSV leads');
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportProgressRows(0);
    }
  };

  const statusBadges: Record<string, string> = {
    New: 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/30',
    Contacted: 'bg-blue-950/40 text-blue-400 border border-blue-800/30',
    Replied: 'bg-pink-950/40 text-pink-400 border border-pink-800/30',
    Interested: 'bg-purple-950/40 text-purple-400 border border-purple-800/30',
    Closed: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads CRM</h1>
          <p className="text-sm text-slate-400 mt-1">Manage, search, sort, and segment your CRM outbound contacts list.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0d0f1a]">All Statuses</option>
              <option value="New" className="bg-[#0d0f1a]">New</option>
              <option value="Contacted" className="bg-[#0d0f1a]">Contacted</option>
              <option value="Replied" className="bg-[#0d0f1a]">Replied</option>
              <option value="Interested" className="bg-[#0d0f1a]">Interested</option>
              <option value="Closed" className="bg-[#0d0f1a]">Closed</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Industry Filter */}
          <input
            type="text"
            placeholder="Filter by Industry..."
            value={industry}
            onChange={(e) => {
              setPage(1);
              setIndustry(e.target.value);
            }}
            className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />

          {/* Country filter */}
          <input
            type="text"
            placeholder="Filter by Country..."
            value={country}
            onChange={(e) => {
              setPage(1);
              setCountry(e.target.value);
            }}
            className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Selected Rows Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-600/10 border border-indigo-600/20 rounded-xl">
            <span className="text-xs font-semibold text-indigo-400">
              {selectedIds.size} leads selected
            </span>
            <div className="flex items-center gap-3">
              {/* Bulk status update */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={bulkStatusToApply}
                    onChange={(e) => setBulkStatusToApply(e.target.value)}
                    className="bg-[#07080d] border border-slate-800 rounded-xl py-1.5 pl-3 pr-10 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0d0f1a]">Update Status...</option>
                    <option value="New" className="bg-[#0d0f1a]">New</option>
                    <option value="Contacted" className="bg-[#0d0f1a]">Contacted</option>
                    <option value="Replied" className="bg-[#0d0f1a]">Replied</option>
                    <option value="Interested" className="bg-[#0d0f1a]">Interested</option>
                    <option value="Closed" className="bg-[#0d0f1a]">Closed</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={handleBulkUpdateStatus}
                  disabled={!bulkStatusToApply}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition duration-200 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              <div className="h-5 w-px bg-slate-800"></div>
              {/* Bulk Delete */}
              <button
                onClick={handleBulkDelete}
                className="bg-red-950/40 hover:bg-red-900 border border-red-800/40 text-red-400 font-semibold py-1.5 px-3 rounded-lg text-xs transition duration-200 cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRM Leads Table */}
      <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-[#121422]/60 border-b border-slate-900 text-slate-400 font-medium">
              <tr>
                <th className="py-4.5 px-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('companyName')}
                  className="py-4.5 px-6 font-semibold cursor-pointer hover:text-white transition"
                >
                  Company Name {sortBy === 'companyName' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('ownerName')}
                  className="py-4.5 px-6 font-semibold cursor-pointer hover:text-white transition"
                >
                  Owner Name {sortBy === 'ownerName' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-4.5 px-6 font-semibold">Email</th>
                <th className="py-4.5 px-6 font-semibold">Industry</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-4.5 px-6 font-semibold cursor-pointer hover:text-white transition"
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-4.5 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Loading CRM records...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No CRM records found matching your filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-900/30 transition duration-150">
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead._id)}
                        onChange={(e) => handleSelectRow(lead._id, e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 font-semibold text-white truncate max-w-[200px]">
                      {lead.companyName}
                      <FoundViaSearch query={lead.sourceQuery} />
                    </td>
                    <td className="py-4 px-6 text-slate-200">{lead.ownerName || <span className="text-slate-600 italic">Unknown</span>}</td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      <div className="space-y-1">
                        <div>{lead.email || <span className="text-slate-600 italic">No email</span>}</div>
                        <LeadEmailProvenance
                          lead={lead}
                          compact
                          onConfirm={() => handleConfirmLeadEmail(lead)}
                          confirming={confirmingLeadId === lead._id}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400 truncate max-w-[150px]">{lead.industry || <span className="text-slate-600 italic">Unknown</span>}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${statusBadges[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeadForView(lead);
                          setShowViewModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition cursor-pointer"
                        title="View Lead Details"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(lead)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition cursor-pointer"
                        title="Edit Lead"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead._id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                        title="Delete Lead"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!loading && totalPages > 1 && (
          <div className="h-16 flex items-center justify-between px-6 border-t border-slate-900 bg-[#121422]/20">
            <span className="text-xs text-slate-400">
              Showing leads {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(page - 1, 1))}
                disabled={page === 1}
                className="p-1.5 bg-[#0d0f1a] hover:bg-slate-900 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-lg cursor-pointer"
              >
                &larr; Prev
              </button>
              <span className="text-xs text-slate-300 px-3 font-semibold">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(page + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 bg-[#0d0f1a] hover:bg-slate-900 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-lg cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT LEAD */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-slate-900 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingLead ? 'Edit CRM Lead' : 'Add New Lead'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4.5 h-4.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@acme.com"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    placeholder="SaaS / Healthcare"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="New York"
                    className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Outreach Status
                  </label>
                  <div className="relative">
                    <select
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2 pl-3 pr-10 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
                    >
                      <option value="New" className="bg-[#0d0f1a]">New</option>
                      <option value="Contacted" className="bg-[#0d0f1a]">Contacted</option>
                      <option value="Replied" className="bg-[#0d0f1a]">Replied</option>
                      <option value="Interested" className="bg-[#0d0f1a]">Interested</option>
                      <option value="Closed" className="bg-[#0d0f1a]">Closed</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  CRM Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Key background context on lead..."
                  rows={3}
                  className="w-full bg-[#07080d] border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  {formSaving ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4.5 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Import CSV Leads List</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportReport(null);
                  setImportError(null);
                  setCsvFile(null);
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Requirements checklist */}
              <div className="bg-[#121422]/60 border border-slate-900 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-semibold text-slate-200">CSV Column Formatting Instructions:</h4>
                <p className="text-slate-400">
                  Your CSV must contain header names in the first row. The following fields are required for each row:
                </p>
                <div className="flex gap-4 text-slate-300 font-medium pt-1">
                  <span className="flex items-center gap-1">✅ email</span>
                  <span className="flex items-center gap-1">✅ companyName</span>
                  <span className="flex items-center gap-1">✅ ownerName</span>
                </div>
                <p className="text-slate-500 text-3xs pt-1">
                  Optional fields: phone, website, industry, country, city, notes
                </p>
              </div>

              {/* Import status errors */}
              {importError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4.5 h-4.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{importError}</span>
                </div>
              )}

              {/* Drag and Drop Container */}
              {!importReport && (
                <form onSubmit={handleImportCsv} className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-slate-600 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-[#090b14]/50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCsvFileChange}
                      accept=".csv"
                      className="hidden"
                    />
                    <svg className="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {csvFile ? (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white truncate max-w-[280px]">
                          {csvFile.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(csvFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-300">Click to upload lead list CSV</p>
                        <p className="text-xs text-slate-500 mt-1">Maximum file size: 5 MB</p>
                      </div>
                    )}
                  </div>

                  {/* Progress bar shown during import */}
                  {importing && (
                    <div className="space-y-2 py-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span className="font-medium text-indigo-300">Importing {importProgressRows} of ~{importTotalRows} rows...</span>
                        <span className="font-mono">{importProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl text-sm transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!csvFile || importing}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2 px-5 rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      {importing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Importing...</span>
                        </>
                      ) : (
                        <span>Upload File</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Import Results Report */}
              {importReport && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#121422]/60 border border-slate-900 rounded-xl p-4 text-center">
                      <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imported</p>
                      <p className="text-3xl font-extrabold text-emerald-400">{importReport.importedCount}</p>
                    </div>
                    <div className="bg-[#121422]/60 border border-slate-900 rounded-xl p-4 text-center">
                      <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Failed</p>
                      <p className="text-3xl font-extrabold text-red-400">{importReport.failedCount}</p>
                    </div>
                  </div>

                  {importReport.failedCount > 0 && (
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                      <div className="bg-red-950/20 border-b border-slate-900 px-4 py-2 text-xs font-semibold text-red-300">
                        Failed Records Details
                      </div>
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-900 text-xs">
                        {importReport.failedRecords.map((err, idx) => (
                          <div key={idx} className="p-3 flex justify-between gap-4 bg-slate-900/10">
                            <div>
                              <span className="font-semibold text-slate-300">Row {err.row}:</span>{' '}
                              <span className="text-slate-400 text-2xs truncate max-w-[150px] inline-block align-middle">{err.email}</span>
                            </div>
                            <span className="text-red-400 font-medium text-right">{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-right">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportReport(null);
                        setImportError(null);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-sm transition duration-200 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW LEAD DETAILS */}
      {showViewModal && selectedLeadForView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Lead Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLeadForView(null);
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <div className="flex items-start justify-between bg-[#121422]/50 border border-slate-900 rounded-xl p-4.5">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white leading-tight">
                    {selectedLeadForView.companyName}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Contact Person: <span className="font-semibold text-slate-200">{selectedLeadForView.ownerName || 'Unknown'}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${statusBadges[selectedLeadForView.status]}`}>
                  {selectedLeadForView.status}
                </span>
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={selectedLeadForView.email ? `mailto:${selectedLeadForView.email}` : undefined}
                      className="text-xs font-semibold text-indigo-400 hover:underline truncate"
                      title="Send Email"
                    >
                      {selectedLeadForView.email || 'No email'}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLeadForView.email ?? '');
                        alert('Email copied to clipboard!');
                      }}
                      className="text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-900 rounded transition cursor-pointer"
                      title="Copy Email"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2">
                    <LeadEmailProvenance
                      lead={selectedLeadForView}
                      onConfirm={() => handleConfirmLeadEmail(selectedLeadForView)}
                      confirming={confirmingLeadId === selectedLeadForView._id}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </span>
                  {selectedLeadForView.phone ? (
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={`tel:${cleanScrapedText(selectedLeadForView.phone)}`}
                        className="text-xs font-semibold text-slate-300 hover:text-white"
                        title="Call Phone"
                      >
                        {cleanScrapedText(selectedLeadForView.phone)}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cleanScrapedText(selectedLeadForView.phone));
                          alert('Phone number copied to clipboard!');
                        }}
                        className="text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-900 rounded transition cursor-pointer"
                        title="Copy Phone"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Not Provided</span>
                  )}
                </div>

                {/* Website */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Website URL
                  </span>
                  {selectedLeadForView.website ? (
                    <a
                      href={selectedLeadForView.website.startsWith('http') ? selectedLeadForView.website : `https://${selectedLeadForView.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline truncate flex items-center gap-1.5"
                    >
                      <span>{selectedLeadForView.website}</span>
                      <svg className="w-3 h-3 text-slate-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Not Provided</span>
                  )}
                </div>

                {/* Industry */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Industry
                  </span>
                  <span className="text-xs font-semibold text-slate-350 truncate">
                    {selectedLeadForView.industry || <span className="text-slate-600 italic">Unknown</span>}
                  </span>
                </div>

                {/* Discovery context (not an industry) */}
                {selectedLeadForView.sourceQuery && (
                  <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {FOUND_VIA_SEARCH_LABEL}
                    </span>
                    <FoundViaSearch query={selectedLeadForView.sourceQuery} block />
                  </div>
                )}

                {/* Location */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Location
                  </span>
                  <span className="text-xs font-semibold text-slate-350 truncate">
                    {selectedLeadForView.city || selectedLeadForView.country ? (
                      `${selectedLeadForView.city || ''}${selectedLeadForView.city && selectedLeadForView.country ? ', ' : ''}${selectedLeadForView.country || ''}`
                    ) : (
                      <span className="text-slate-600 italic">Unknown</span>
                    )}
                  </span>
                </div>

                {/* Created At */}
                <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Added To CRM
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {new Date(selectedLeadForView.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-[#121422]/20 border border-slate-900/40 rounded-xl p-4.5 flex flex-col space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  CRM Notes & History
                </span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {cleanScrapedText(selectedLeadForView.notes) || (
                    <span className="text-slate-600 italic">No notes or background context saved for this lead contact.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4.5 border-t border-slate-900 flex items-center justify-between bg-[#121422]/20">
              <button
                onClick={() => {
                  const leadToEdit = selectedLeadForView;
                  // Close View Modal
                  setShowViewModal(false);
                  setSelectedLeadForView(null);
                  // Open Edit Modal
                  handleOpenEdit(leadToEdit);
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-semibold py-2 px-4 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Lead</span>
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLeadForView(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-xs transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
