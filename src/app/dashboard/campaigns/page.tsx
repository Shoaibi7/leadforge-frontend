'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../../services/api';
import { CampaignStatusBadge, RequiresReviewNotice } from '../../../components/campaigns/CampaignStatusBadge';
import { SimulatedOutreachNotice } from '../../../components/campaigns/SimulatedOutreachNotice';
import { CampaignLifecycleActions } from '../../../components/campaigns/CampaignLifecycleActions';
import { DeliveryStatusCell } from '../../../components/campaigns/DeliveryStatusCell';
import { LeadEmailProvenance } from '../../../components/leads/LeadEmailProvenance';
import type { EmailSourceType } from '../../../lib/lead-email-provenance';
import {
  CampaignStatus,
  DeliveryStatus,
  RESOLVE_CONFIRMATION_MESSAGES,
  ResolutionDecision,
  STOP_CONFIRMATION_MESSAGE,
  canDeleteCampaign,
  createSingleFlight,
  requestResolveDelivery,
  requestStopCampaign,
} from '../../../lib/campaign-status';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  emailTemplateId: string;
  leadList: string[];
  status: CampaignStatus;
  requiresReview?: boolean;
  schedule?: string;
  createdAt: string;
}

interface Template {
  _id: string;
  name: string;
  body: string;
  variables: string[];
}

interface Lead {
  _id: string;
  companyName: string;
  ownerName?: string;
  email?: string;
  emailSourceType?: EmailSourceType;
  emailSourceMethod?: string;
  emailSourceUrl?: string;
  emailOutreachEligible?: boolean;
  status: string;
  industry?: string;
  country?: string;
}

interface EmailLog {
  _id: string;
  recipientEmail: string;
  status: string;
  deliveryStatus?: DeliveryStatus;
  resolution?: ResolutionDecision;
  resolvable?: boolean;
  skipReason?: string;
  simulated?: boolean;
  errorMessage?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  createdAt: string;
  lead?: {
    ownerName: string;
    companyName: string;
  };
}

interface AnalyticsData {
  campaign: {
    _id: string;
    name: string;
    subject: string;
    status: string;
    requiresReview?: boolean;
    createdAt: string;
  };
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    failed: number;
    uncertain?: number;
    /** Deliveries completed without sending (outreach email disabled). Not part of sent/delivered. */
    simulated?: number;
  };
  logs: EmailLog[];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Creation Wizard states
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Form states
  const [campName, setCampName] = useState('');
  const [campSubject, setCampSubject] = useState('');
  const [campTemplateId, setCampTemplateId] = useState('');
  const [campSchedule, setCampSchedule] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Wizard Step 3 Leads table states
  const [wizardLeads, setWizardLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [leadIndustryFilter, setLeadIndustryFilter] = useState('');
  const [leadCountryFilter, setLeadCountryFilter] = useState('');

  // Campaign Analytics Modal states
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedCampaignIdForAnalytics, setSelectedCampaignIdForAnalytics] = useState<string | null>(null);

  // Action status loading
  const [actionLoadingCampaignId, setActionLoadingCampaignId] = useState<string | null>(null);
  const [resolvingDeliveryId, setResolvingDeliveryId] = useState<string | null>(null);
  // Synchronous guard against double submission (state updates are async)
  const singleFlight = useRef(createSingleFlight());
  const [formSaving, setFormSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Fetch campaigns and templates
  const fetchData = async () => {
    try {
      setLoading(true);
      const [campResponse, tempResponse] = await Promise.all([
        api.get('/campaigns'),
        api.get('/templates'),
      ]);
      setCampaigns(campResponse.data);
      setTemplates(tempResponse.data);
    } catch (err) {
      console.error('Error fetching campaigns data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch leads for the Wizard selection
  const fetchWizardLeads = async () => {
    try {
      setLeadsLoading(true);
      const response = await api.get('/leads', {
        params: {
          limit: 250, // Fetch up to 250 leads for wizard selection
          search: leadSearch || undefined,
          status: leadStatusFilter || undefined,
          industry: leadIndustryFilter || undefined,
          country: leadCountryFilter || undefined,
        },
      });
      setWizardLeads(response.data.leads || []);
    } catch (err) {
      console.error('Error fetching wizard leads', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (showWizard && wizardStep === 3) {
      fetchWizardLeads();
    }
  }, [showWizard, wizardStep, leadStatusFilter, leadIndustryFilter, leadCountryFilter]);

  // Debounced search trigger for wizard leads
  useEffect(() => {
    if (showWizard && wizardStep === 3) {
      const handler = setTimeout(() => {
        fetchWizardLeads();
      }, 400);
      return () => clearTimeout(handler);
    }
  }, [leadSearch]);

  // Fetch campaign analytics
  const fetchCampaignAnalytics = async (campaignId: string) => {
    try {
      setAnalyticsLoading(true);
      setShowAnalyticsModal(true);
      setSelectedCampaignIdForAnalytics(campaignId);
      const response = await api.get(`/campaigns/${campaignId}/analytics`);
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching campaign analytics', err);
      alert('Failed to fetch campaign analytics');
      setShowAnalyticsModal(false);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleOpenCreateWizard = () => {
    setEditingCampaignId(null);
    setCampName('');
    setCampSubject('');
    setCampTemplateId('');
    setCampSchedule('');
    setSelectedLeadIds(new Set());
    setWizardStep(1);
    setWizardError(null);
    setShowWizard(true);
  };

  const handleOpenEditWizard = (campaign: Campaign) => {
    setEditingCampaignId(campaign._id);
    setCampName(campaign.name);
    setCampSubject(campaign.subject);
    setCampTemplateId(campaign.emailTemplateId);
    setCampSchedule(campaign.schedule ? new Date(campaign.schedule).toISOString().substring(0, 16) : '');
    setSelectedLeadIds(new Set(campaign.leadList));
    setWizardStep(1);
    setWizardError(null);
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingCampaignId(null);
    setCampName('');
    setCampSubject('');
    setCampTemplateId('');
    setCampSchedule('');
    setSelectedLeadIds(new Set());
    setWizardError(null);
  };

  const handleSelectAllLeads = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(selectedLeadIds);
      wizardLeads.forEach((l) => allIds.add(l._id));
      setSelectedLeadIds(allIds);
    } else {
      const allIds = new Set(selectedLeadIds);
      wizardLeads.forEach((l) => allIds.delete(l._id));
      setSelectedLeadIds(allIds);
    }
  };

  const handleSelectLeadRow = (id: string, checked: boolean) => {
    const next = new Set(selectedLeadIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedLeadIds(next);
  };

  const handleSaveCampaign = async (launchImmediately: boolean) => {
    setWizardError(null);
    setFormSaving(true);

    const payload = {
      name: campName,
      subject: campSubject,
      emailTemplateId: campTemplateId,
      leadList: Array.from(selectedLeadIds),
      schedule: campSchedule || undefined,
    };

    try {
      let savedCampaign;
      if (editingCampaignId) {
        const res = await api.patch(`/campaigns/${editingCampaignId}`, payload);
        savedCampaign = res.data;
      } else {
        const res = await api.post('/campaigns', payload);
        savedCampaign = res.data;
      }

      if (launchImmediately) {
        await api.post(`/campaigns/${savedCampaign._id}/start`);
      }

      handleCloseWizard();
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save outreach campaign';
      setWizardError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setFormSaving(false);
    }
  };

  const handleTriggerCampaignStart = async (campaignId: string) => {
    if (!confirm('Are you sure you want to start this campaign now? This will dispatch emails immediately.')) return;
    try {
      setActionLoadingCampaignId(campaignId);
      await api.post(`/campaigns/${campaignId}/start`);
      fetchData();
    } catch (err) {
      alert('Failed to start campaign outreach logs');
    } finally {
      setActionLoadingCampaignId(null);
    }
  };

  const handleStopCampaign = (campaignId: string) =>
    singleFlight.current.run(`stop:${campaignId}`, async () => {
      if (!confirm(STOP_CONFIRMATION_MESSAGE)) return;
      setActionLoadingCampaignId(campaignId);
      try {
        const result = await requestStopCampaign(api, campaignId);
        if (!result.ok) {
          // 409: the campaign is no longer running (e.g. it just finished). Show why and refresh.
          alert(result.message);
        }
        await fetchData();
        if (showAnalyticsModal && selectedCampaignIdForAnalytics === campaignId) {
          await fetchCampaignAnalytics(campaignId);
        }
      } finally {
        setActionLoadingCampaignId(null);
      }
    });

  const handleResolveDelivery = (deliveryId: string, decision: ResolutionDecision) => {
    const campaignId = selectedCampaignIdForAnalytics;
    if (!campaignId) return;
    return singleFlight.current.run(`resolve:${deliveryId}`, async () => {
      if (!confirm(RESOLVE_CONFIRMATION_MESSAGES[decision])) return;
      setResolvingDeliveryId(deliveryId);
      try {
        const result = await requestResolveDelivery(api, campaignId, deliveryId, decision);
        if (!result.ok) alert(result.message);
        await Promise.all([fetchCampaignAnalytics(campaignId), fetchData()]);
      } finally {
        setResolvingDeliveryId(null);
      }
    });
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this outreach campaign?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete campaign');
    }
  };

  const selectedTemplate = templates.find((t) => t._id === campTemplateId);

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build multi-lead campaign strategies, associate templates, track links, and monitor conversions.
          </p>
        </div>
        <button
          onClick={handleOpenCreateWizard}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition duration-200 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Campaign</span>
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
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Campaigns Listing */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Loading outreach campaigns...</span>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-[#0d0f1a]/20 border border-slate-900 rounded-2xl py-16 text-center text-slate-500">
          <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">No campaigns found</p>
          <p className="text-xs text-slate-500 mt-1">Create a campaign wizard flow to launch your outbound outreach pipeline.</p>
        </div>
      ) : (
        <div className="bg-[#0d0f1a]/40 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead className="bg-[#121422]/60 border-b border-slate-900 text-slate-400 font-medium">
                <tr>
                  <th className="py-4.5 px-6 font-semibold">Campaign Name</th>
                  <th className="py-4.5 px-6 font-semibold">Subject Line</th>
                  <th className="py-4.5 px-6 font-semibold">Target Leads</th>
                  <th className="py-4.5 px-6 font-semibold">Status</th>
                  <th className="py-4.5 px-6 font-semibold">Created</th>
                  <th className="py-4.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredCampaigns.map((camp) => {
                  const isRunning = camp.status === 'Running';
                  const isActionLoading = actionLoadingCampaignId === camp._id;
                  const associatedTemplate = templates.find((t) => t._id === camp.emailTemplateId);

                  return (
                    <tr key={camp._id} className="hover:bg-slate-900/30 transition duration-150">
                      <td className="py-4.5 px-6 font-semibold text-white">
                        <div>
                          <p>{camp.name}</p>
                          <span className="text-3xs text-slate-500 font-mono">
                            Temp: {associatedTemplate?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-slate-300 truncate max-w-[200px]" title={camp.subject}>
                        {camp.subject}
                      </td>
                      <td className="py-4.5 px-6 text-slate-400 font-semibold">{camp.leadList?.length || 0} leads</td>
                      <td className="py-4.5 px-6">
                        <CampaignStatusBadge status={camp.status} requiresReview={camp.requiresReview} />
                      </td>
                      <td className="py-4.5 px-6 text-slate-500 text-xs">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4.5 px-6 text-right space-x-2">
                        {/* Start / Stop (only where the campaign state machine allows it) */}
                        <CampaignLifecycleActions
                          status={camp.status}
                          busy={isActionLoading}
                          onStart={() => handleTriggerCampaignStart(camp._id)}
                          onStop={() => handleStopCampaign(camp._id)}
                        />

                        {/* View Analytics Button */}
                        {camp.status !== 'Draft' && (
                          <button
                            onClick={() => fetchCampaignAnalytics(camp._id)}
                            className="p-1.5 text-pink-400 hover:text-pink-300 hover:bg-slate-900 rounded-lg transition cursor-pointer inline-flex items-center"
                            title="Campaign Analytics"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                        )}

                        {/* Edit Button */}
                        {camp.status === 'Draft' && (
                          <button
                            onClick={() => handleOpenEditWizard(camp)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition cursor-pointer inline-flex items-center"
                            title="Edit Campaign"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}

                        {/* Delete Button (a running campaign must be stopped first) */}
                        {canDeleteCampaign(camp.status) && (
                        <button
                          onClick={() => handleDeleteCampaign(camp._id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition cursor-pointer inline-flex items-center"
                          title="Delete Campaign"
                        >
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CAMPAIGN WIZARD CREATION MODAL */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-900 flex items-center justify-between bg-[#0b0d17]">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingCampaignId ? 'Edit Outreach Campaign' : 'Create Campaign Wizard'}
                </h3>
                {/* Wizard steps indicator bar */}
                <div className="flex items-center gap-2 mt-1.5 text-3xs font-semibold text-slate-500 uppercase tracking-widest">
                  <span className={wizardStep === 1 ? 'text-indigo-400 font-bold' : ''}>1. Details</span>
                  <span>&rarr;</span>
                  <span className={wizardStep === 2 ? 'text-indigo-400 font-bold' : ''}>2. Template</span>
                  <span>&rarr;</span>
                  <span className={wizardStep === 3 ? 'text-indigo-400 font-bold' : ''}>3. Target Leads</span>
                  <span>&rarr;</span>
                  <span className={wizardStep === 4 ? 'text-indigo-400 font-bold' : ''}>4. Review</span>
                </div>
              </div>
              <button
                onClick={handleCloseWizard}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {wizardError && (
                <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <span>❌ {wizardError}</span>
                </div>
              )}

              {/* STEP 1: CAMPAIGN DETAILS */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      placeholder="June SaaS Founder Outreach"
                      className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Subject Line *
                    </label>
                    <input
                      type="text"
                      value={campSubject}
                      onChange={(e) => setCampSubject(e.target.value)}
                      placeholder="Hi {{ownerName}} - partnership query for {{companyName}}"
                      className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition"
                      required
                    />
                    <p className="text-3xs text-slate-500 mt-1">
                      You can use interpolation brackets like <code className="text-indigo-400 font-mono">&#123;&#123;ownerName&#125;&#125;</code>, <code className="text-indigo-400 font-mono">&#123;&#123;companyName&#125;&#125;</code>, and <code className="text-indigo-400 font-mono">&#123;&#123;industry&#125;&#125;</code> inside the subject.
                    </p>
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Schedule Outbound (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={campSchedule}
                      onChange={(e) => setCampSchedule(e.target.value)}
                      className="w-full bg-[#07080d] border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <p className="text-3xs text-slate-500 mt-1">Leave blank to dispatch outreach immediately on request.</p>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE TEMPLATE */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Select one of your email templates for this outreach campaign:</p>
                  
                  {templates.length === 0 ? (
                    <div className="py-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                      <p className="text-sm font-semibold">No Email Templates Found</p>
                      <p className="text-xs text-slate-600 mt-1">Go to the Email Templates tab to build one first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((temp) => (
                        <div
                          key={temp._id}
                          onClick={() => setCampTemplateId(temp._id)}
                          className={`p-4 border rounded-2xl cursor-pointer hover:border-slate-700 transition flex flex-col justify-between ${
                            campTemplateId === temp._id
                              ? 'bg-indigo-600/10 border-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/5'
                              : 'bg-[#07080d] border-slate-900 text-slate-400'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm text-slate-200 truncate">{temp.name}</h4>
                              {campTemplateId === temp._id && (
                                <span className="bg-indigo-500 text-white rounded-full p-0.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <p className="text-3xs font-mono line-clamp-3 bg-black/40 p-2.5 rounded-lg border border-slate-950">
                              {temp.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTemplate && (
                    <div className="bg-[#07080d] border border-slate-900 rounded-xl p-4 mt-3">
                      <h4 className="text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Template Preview:</h4>
                      <p className="text-xs font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {selectedTemplate.body}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SELECT TARGET LEADS */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-indigo-600/10 border border-indigo-600/20 rounded-xl">
                    <span className="text-xs font-semibold text-indigo-400">
                      {selectedLeadIds.size} leads currently selected for the campaign
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadIds(new Set())}
                      className="text-3xs font-semibold text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>

                  {/* Filtering mini-bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#07080d] border border-slate-900 p-4 rounded-xl">
                    <input
                      type="text"
                      placeholder="Search name/email..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="bg-[#0d0f1a]/40 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />

                    <select
                      value={leadStatusFilter}
                      onChange={(e) => setLeadStatusFilter(e.target.value)}
                      className="bg-[#0d0f1a]/40 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Replied">Replied</option>
                      <option value="Interested">Interested</option>
                      <option value="Closed">Closed</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Filter by Industry..."
                      value={leadIndustryFilter}
                      onChange={(e) => setLeadIndustryFilter(e.target.value)}
                      className="bg-[#0d0f1a]/40 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />

                    <input
                      type="text"
                      placeholder="Filter by Country..."
                      value={leadCountryFilter}
                      onChange={(e) => setLeadCountryFilter(e.target.value)}
                      className="bg-[#0d0f1a]/40 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Leads Selection Table */}
                  <div className="border border-slate-900 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#121422]/60 border-b border-slate-900 text-slate-400 font-medium">
                        <tr>
                          <th className="py-2.5 px-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={wizardLeads.length > 0 && wizardLeads.every((l) => selectedLeadIds.has(l._id))}
                              onChange={handleSelectAllLeads}
                              className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-4 font-semibold">Company</th>
                          <th className="py-2.5 px-4 font-semibold">Owner</th>
                          <th className="py-2.5 px-4 font-semibold">Email</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {leadsLoading ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              <span>Loading leads for selection...</span>
                            </td>
                          </tr>
                        ) : wizardLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No CRM leads found. Check your filters.
                            </td>
                          </tr>
                        ) : (
                          wizardLeads.map((lead) => (
                            <tr key={lead._id} className="hover:bg-slate-900/20">
                              <td className="py-2 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.has(lead._id)}
                                  onChange={(e) => handleSelectLeadRow(lead._id, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-4 font-semibold text-white truncate max-w-[150px]">{lead.companyName}</td>
                              <td className="py-2 px-4 text-slate-200">{lead.ownerName || <span className="text-slate-600 italic">Unknown</span>}</td>
                              <td className="py-2 px-4 text-slate-400 font-mono text-3xs">
                                <div className="space-y-0.5">
                                  <div>{lead.email || <span className="italic text-slate-600">No email</span>}</div>
                                  <LeadEmailProvenance lead={lead} compact />
                                  {!lead.emailOutreachEligible && (
                                    <div className="text-4xs text-yellow-300/80 font-sans">Will be skipped: not eligible for outreach</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-4 text-3xs text-slate-400">{lead.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & SAVE */}
              {wizardStep === 4 && (
                <div className="space-y-5">
                  <p className="text-xs text-slate-400">Please review your outreach configuration details before dispatching:</p>
                  
                  <div className="bg-[#07080d] border border-slate-900 rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Campaign Name</span>
                        <span className="text-sm font-semibold text-white">{campName}</span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Email Subject Line</span>
                        <span className="text-sm font-semibold text-white">{campSubject}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Template Selected</span>
                        <span className="text-sm font-semibold text-indigo-400">{selectedTemplate?.name || 'No Template Selected'}</span>
                      </div>
                      <div>
                        <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Total Target Leads</span>
                        <span className="text-sm font-bold text-white">{selectedLeadIds.size} leads selected</span>
                      </div>
                    </div>

                    {campSchedule && (
                      <div>
                        <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Scheduled Date/Time</span>
                        <span className="text-sm font-semibold text-blue-400">{new Date(campSchedule).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 text-xs text-amber-400 leading-relaxed">
                    <strong>⚠️ Ready for Dispatch:</strong> If you select "Save & Launch", the background outreach loop will fetch your SMTP settings and immediately start drafting and delivering customized outbound communications to the selected leads.
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-900 flex items-center justify-between bg-[#0b0d17]">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                  >
                    &larr; Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseWizard}
                  className="bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && (!campName || !campSubject)) {
                        setWizardError('Campaign name and email subject are required.');
                        return;
                      }
                      if (wizardStep === 2 && !campTemplateId) {
                        setWizardError('Please select an email template.');
                        return;
                      }
                      if (wizardStep === 3 && selectedLeadIds.size === 0) {
                        setWizardError('Please select at least 1 lead to target.');
                        return;
                      }
                      setWizardError(null);
                      setWizardStep(wizardStep + 1);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs transition duration-200 cursor-pointer"
                  >
                    Next Step &rarr;
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign(false)}
                      disabled={formSaving}
                      className="bg-[#121422] hover:bg-[#1a1d30] border border-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign(true)}
                      disabled={formSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 transition duration-200 cursor-pointer"
                    >
                      {formSaving ? 'Launching...' : 'Save & Launch Campaign'}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CAMPAIGN ANALYTICS MODAL */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[#0d0f1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between bg-[#0b0d17]">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {analyticsData ? `Analytics: ${analyticsData.campaign.name}` : 'Fetching Campaign Analytics...'}
                </h3>
                {analyticsData && (
                  <p className="text-3xs text-slate-500 font-mono mt-0.5">
                    Subject: {analyticsData.campaign.subject}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {analyticsData && (
                  <button
                    onClick={() => fetchCampaignAnalytics(analyticsData.campaign._id)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition cursor-pointer"
                    title="Refresh Stats"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAnalyticsModal(false);
                    setAnalyticsData(null);
                  }}
                  className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-900 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {analyticsLoading && !analyticsData ? (
                <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
                  <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading performance metrics...</span>
                </div>
              ) : analyticsData ? (
                <>
                  {analyticsData.campaign.requiresReview && (
                    <RequiresReviewNotice uncertainCount={analyticsData.stats.uncertain} />
                  )}
                  <SimulatedOutreachNotice count={analyticsData.stats.simulated} />

                  {/* Stats Aggregate row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#07080d]/80 border border-slate-900 p-4.5 rounded-2xl">
                      <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Sent Logs</span>
                      <p className="text-2xl font-bold text-white mt-1">{analyticsData.stats.sent}</p>
                    </div>

                    <div className="bg-[#07080d]/80 border border-slate-900 p-4.5 rounded-2xl">
                      <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</span>
                      <p className="text-2xl font-bold text-blue-400 mt-1">{analyticsData.stats.delivered}</p>
                      <span className="text-4xs text-slate-500 block mt-0.5">
                        {analyticsData.stats.sent > 0 ? Math.round((analyticsData.stats.delivered / analyticsData.stats.sent) * 100) : 0}% delivery rate
                      </span>
                    </div>

                    <div className="bg-[#07080d]/80 border border-slate-900 p-4.5 rounded-2xl">
                      <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Opened</span>
                      <p className="text-2xl font-bold text-amber-400 mt-1">{analyticsData.stats.opened}</p>
                      <span className="text-4xs text-slate-500 block mt-0.5">
                        {analyticsData.stats.sent > 0 ? Math.round((analyticsData.stats.opened / analyticsData.stats.sent) * 100) : 0}% open rate
                      </span>
                    </div>

                    <div className="bg-[#07080d]/80 border border-slate-900 p-4.5 rounded-2xl">
                      <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Clicked</span>
                      <p className="text-2xl font-bold text-purple-400 mt-1">{analyticsData.stats.clicked}</p>
                      <span className="text-4xs text-slate-500 block mt-0.5">
                        {analyticsData.stats.sent > 0 ? Math.round((analyticsData.stats.clicked / analyticsData.stats.sent) * 100) : 0}% click rate
                      </span>
                    </div>

                    <div className="bg-[#07080d]/80 border border-slate-900 p-4.5 rounded-2xl">
                      <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">Failed</span>
                      <p className="text-2xl font-bold text-red-500 mt-1">{analyticsData.stats.failed}</p>
                      <span className="text-4xs text-slate-500 block mt-0.5">
                        {analyticsData.stats.sent > 0 ? Math.round((analyticsData.stats.failed / analyticsData.stats.sent) * 100) : 0}% bounce rate
                      </span>
                    </div>
                  </div>

                  {/* detailed log list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Email Dispatch Logs History</h4>
                    
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#121422]/60 border-b border-slate-900 text-slate-400 font-medium">
                          <tr>
                            <th className="py-3 px-4">Recipient</th>
                            <th className="py-3 px-4">Lead Info</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Sent At</th>
                            <th className="py-3 px-4">Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {analyticsData.logs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500">
                                No email logs found. Wait for campaign execution loop.
                              </td>
                            </tr>
                          ) : (
                            analyticsData.logs.map((log) => (
                              <tr key={log._id} className="hover:bg-slate-900/15">
                                <td className="py-2.5 px-4 font-mono font-medium text-white">{log.recipientEmail}</td>
                                <td className="py-2.5 px-4">
                                  {log.lead ? (
                                    <span>
                                      {log.lead.ownerName || 'Unknown contact'} ({log.lead.companyName})
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 italic">No CRM ref</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4">
                                  <DeliveryStatusCell
                                    log={log}
                                    onResolve={handleResolveDelivery}
                                    resolving={resolvingDeliveryId === log._id}
                                  />
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 font-mono text-4xs">
                                  {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 text-slate-400 space-y-0.5">
                                  {log.openedAt && (
                                    <p className="text-4xs text-amber-500 font-mono">
                                      👁️ Opened: {new Date(log.openedAt).toLocaleTimeString()}
                                    </p>
                                  )}
                                  {log.clickedAt && (
                                    <p className="text-4xs text-purple-400 font-mono">
                                      🔗 Clicked: {new Date(log.clickedAt).toLocaleTimeString()}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-slate-900 flex justify-end bg-[#0b0d17]">
              <button
                onClick={() => {
                  setShowAnalyticsModal(false);
                  setAnalyticsData(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-sm transition cursor-pointer"
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
