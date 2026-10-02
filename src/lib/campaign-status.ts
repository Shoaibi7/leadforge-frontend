/**
 * Campaign / delivery status presentation and the actions each status allows.
 * Mirrors the backend state machine (backend/src/modules/campaigns/campaign-state.ts):
 *   Draft/Scheduled --start--> Running --stop--> Stopped
 *   Running --(system)--> Completed | Failed
 * Completed, Failed and Stopped are terminal and can never be started again.
 */

import { SKIP_REASON_TEXT } from './lead-email-provenance';

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Running' | 'Completed' | 'Failed' | 'Stopped';

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'uncertain'
  | 'cancelled'
  | 'skipped';

export type ResolutionDecision = 'treat_as_sent' | 'treat_as_failed';

interface StatusStyle {
  label: string;
  className: string;
  description: string;
}

export const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, StatusStyle> = {
  Draft: {
    label: 'Draft',
    className: 'bg-slate-950/40 text-slate-400 border border-slate-800/30',
    description: 'Not started yet. You can still edit this campaign.',
  },
  Scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-950/40 text-blue-400 border border-blue-800/30',
    description: 'Not started yet.',
  },
  Running: {
    label: 'Running',
    className: 'bg-amber-950/40 text-amber-400 border border-amber-800/30 animate-pulse',
    description: 'Emails are being sent.',
  },
  Completed: {
    label: 'Completed',
    className: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30',
    description: 'Finished. At least one email was delivered.',
  },
  Failed: {
    label: 'Failed',
    className: 'bg-red-950/40 text-red-400 border border-red-800/30',
    description: 'Finished without any confirmed delivery.',
  },
  Stopped: {
    label: 'Stopped',
    className: 'bg-zinc-900/60 text-zinc-300 border border-zinc-600/40',
    description: 'Stopped by you. Emails that had not been sent were cancelled.',
  },
};

const UNKNOWN_STATUS_STYLE: StatusStyle = {
  label: 'Unknown',
  className: 'bg-slate-950/40 text-slate-400 border border-slate-800/30',
  description: '',
};

export function campaignStatusStyle(status: string): StatusStyle {
  return CAMPAIGN_STATUS_STYLES[status as CampaignStatus] ?? { ...UNKNOWN_STATUS_STYLE, label: status };
}

/** Only campaigns that have never started can be started (re-running would re-send emails). */
export function canStartCampaign(status: string): boolean {
  return status === 'Draft' || status === 'Scheduled';
}

export function canStopCampaign(status: string): boolean {
  return status === 'Running';
}

/** A running campaign must be stopped before it can be deleted. */
export function canDeleteCampaign(status: string): boolean {
  return status !== 'Running';
}

export const REQUIRES_REVIEW_TITLE = 'Needs review';
export const REQUIRES_REVIEW_MESSAGE =
  'LeadForge could not confirm the outcome of one or more emails in this campaign. ' +
  'They may or may not have reached the recipient, and they were not sent again automatically. ' +
  'Review them in the campaign analytics.';

export const UNCERTAIN_DELIVERY_EXPLANATION =
  'The email may have been accepted by the mail provider, but LeadForge could not confirm the final result. ' +
  'It was not automatically sent again.';

export const STOP_CONFIRMATION_MESSAGE = [
  'Stop this campaign?',
  '',
  '• Emails that have not been sent yet will be cancelled and will not be sent.',
  '• An email that is being sent at this moment may still complete.',
  '• Emails that were already sent are not affected.',
  '',
  'A stopped campaign cannot be restarted.',
].join('\n');

export const RESOLVE_CONFIRMATION_MESSAGES: Record<ResolutionDecision, string> = {
  treat_as_sent: [
    'Mark this email as sent?',
    '',
    'Choose this if you know the recipient received it.',
    'LeadForge only records your decision. It will not send the email again.',
  ].join('\n'),
  treat_as_failed: [
    'Mark this email as failed?',
    '',
    'Choose this if you know it was not delivered.',
    'LeadForge only records your decision. It will not resend the email.',
  ].join('\n'),
};

export interface DeliveryLogLike {
  status: string;
  deliveryStatus?: DeliveryStatus;
  resolution?: ResolutionDecision;
  resolvable?: boolean;
  /** Backend reason code for skipped deliveries (e.g. EMAIL_PROVENANCE_UNVERIFIED). */
  skipReason?: string;
  /** True when the delivery never reached an email provider (outreach email disabled). */
  simulated?: boolean;
}

/** Shown for deliveries that completed in simulation mode: nothing was sent to the lead. */
export const SIMULATED_DELIVERY_NOTE = 'Not sent: outreach email is disabled, so no email left LeadForge.';

export interface DeliveryDisplay {
  kind: DeliveryStatus;
  label: string;
  className: string;
  /** Extra human-readable context shown under the badge (never provider error text). */
  note?: string;
}

const ENGAGEMENT_STYLES: Record<string, string> = {
  Delivered: 'bg-blue-950/40 text-blue-400 border border-blue-800/30',
  Opened: 'bg-amber-950/40 text-amber-400 border border-amber-800/30',
  Clicked: 'bg-purple-950/40 text-purple-400 border border-purple-800/30',
  Replied: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30',
};

export function deliveryDisplay(log: DeliveryLogLike): DeliveryDisplay {
  const kind: DeliveryStatus = log.deliveryStatus ?? 'sent';
  switch (kind) {
    case 'pending':
    case 'processing':
      return { kind, label: 'Pending', className: 'bg-slate-950/40 text-slate-400 border border-slate-800/30' };
    case 'sending':
      return { kind, label: 'Sending', className: 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/30' };
    case 'sent': {
      if (log.simulated) {
        return {
          kind,
          label: 'Simulated',
          className: 'bg-zinc-900/60 text-zinc-300 border border-zinc-600/40',
          note: SIMULATED_DELIVERY_NOTE,
        };
      }
      const engaged = ENGAGEMENT_STYLES[log.status] ? log.status : 'Delivered';
      return {
        kind,
        label: engaged,
        className: ENGAGEMENT_STYLES[engaged],
        note: log.resolution === 'treat_as_sent' ? 'Marked as sent by you (not confirmed by the mail provider).' : undefined,
      };
    }
    case 'failed':
      return {
        kind,
        label: 'Failed',
        className: 'bg-red-950/40 text-red-400 border border-red-800/30',
        note: log.resolution === 'treat_as_failed' ? 'Marked as failed by you.' : undefined,
      };
    case 'uncertain':
      return {
        kind,
        label: 'Unconfirmed',
        className: 'bg-yellow-950/40 text-yellow-300 border border-yellow-600/40',
        note: UNCERTAIN_DELIVERY_EXPLANATION,
      };
    case 'cancelled':
      return {
        kind,
        label: 'Cancelled',
        className: 'bg-zinc-900/60 text-zinc-400 border border-zinc-700/40',
        note: 'Not sent: the campaign was stopped.',
      };
    case 'skipped':
      return {
        kind,
        label: 'Skipped',
        className: 'bg-zinc-900/60 text-zinc-400 border border-zinc-700/40',
        note: (log.skipReason && SKIP_REASON_TEXT[log.skipReason]) || 'Not sent: the lead is no longer available.',
      };
    default:
      return { kind, label: log.status, className: 'bg-slate-950/40 text-slate-400 border border-slate-800/30' };
  }
}

/** Minimal HTTP surface used by the actions below (the shared axios instance satisfies it). */
export interface PostClient {
  post: (url: string, body?: unknown) => Promise<{ data: unknown }>;
}

export type ActionResult = { ok: true; data: unknown } | { ok: false; status?: number; message: string };

function toFailure(err: unknown, fallback: string): ActionResult {
  const e = err as { response?: { status?: number; data?: { message?: unknown } } };
  const raw = e?.response?.data?.message;
  const message = Array.isArray(raw) ? String(raw[0]) : typeof raw === 'string' ? raw : fallback;
  return { ok: false, status: e?.response?.status, message };
}

export async function requestStopCampaign(client: PostClient, campaignId: string): Promise<ActionResult> {
  try {
    const res = await client.post(`/campaigns/${campaignId}/stop`);
    return { ok: true, data: res.data };
  } catch (err) {
    return toFailure(err, 'Failed to stop the campaign. Please try again.');
  }
}

export async function requestResolveDelivery(
  client: PostClient,
  campaignId: string,
  deliveryId: string,
  decision: ResolutionDecision,
): Promise<ActionResult> {
  try {
    const res = await client.post(`/campaigns/${campaignId}/deliveries/${deliveryId}/resolve`, { decision });
    return { ok: true, data: res.data };
  } catch (err) {
    return toFailure(err, 'Failed to save your decision. Please try again.');
  }
}

/**
 * Guards an action so it cannot run twice concurrently for the same key (e.g. a double click
 * on Stop, or two clicks on "Mark as sent"). Synchronous, unlike React state updates.
 */
export function createSingleFlight() {
  const inFlight = new Set<string>();
  return {
    isRunning: (key: string) => inFlight.has(key),
    async run<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
      if (inFlight.has(key)) return undefined;
      inFlight.add(key);
      try {
        return await fn();
      } finally {
        inFlight.delete(key);
      }
    },
  };
}
