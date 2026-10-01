/**
 * How a lead's email provenance is shown to users. The backend decides eligibility
 * (lead.emailOutreachEligible); this module only explains it in plain language.
 */

export type EmailSourceType = 'manual' | 'website' | 'imported' | 'inferred' | 'unknown';

export interface LeadEmailInfo {
  email?: string;
  emailSourceType?: EmailSourceType;
  emailSourceMethod?: string;
  emailSourceUrl?: string;
  emailOutreachEligible?: boolean;
}

export interface ProvenanceDisplay {
  label: string;
  className: string;
  explanation: string;
  /** May the user confirm this address as a contact? */
  confirmable: boolean;
  eligible: boolean;
}

const GOOD = 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/30';
const NEUTRAL = 'bg-blue-950/40 text-blue-300 border border-blue-800/30';
const WARN = 'bg-yellow-950/40 text-yellow-300 border border-yellow-600/40';
const BLOCKED = 'bg-red-950/40 text-red-300 border border-red-800/30';
const NONE = 'bg-slate-950/40 text-slate-400 border border-slate-800/30';

export const NOT_ELIGIBLE_SUFFIX = 'LeadForge will not send campaign emails to it until you confirm it.';

export function emailProvenanceDisplay(lead: LeadEmailInfo): ProvenanceDisplay {
  if (!lead.email) {
    return {
      label: 'No email found',
      className: NONE,
      explanation: 'No email address was found for this business. LeadForge does not guess addresses.',
      confirmable: false,
      eligible: false,
    };
  }
  const eligible = lead.emailOutreachEligible === true;
  switch (lead.emailSourceType) {
    case 'website':
      return {
        label: 'Found on website',
        className: GOOD,
        explanation: "This address was published on the business's website.",
        confirmable: false,
        eligible,
      };
    case 'manual':
      return lead.emailSourceMethod === 'operator_confirmation'
        ? {
            label: 'Confirmed by you',
            className: GOOD,
            explanation: 'You confirmed this as a contact address. LeadForge has not checked that the mailbox exists.',
            confirmable: false,
            eligible,
          }
        : {
            label: 'Entered by you',
            className: NEUTRAL,
            explanation: 'You entered this address.',
            confirmable: false,
            eligible,
          };
    case 'imported':
      return {
        label: 'Imported',
        className: NEUTRAL,
        explanation: 'This address came from a file you imported.',
        confirmable: false,
        eligible,
      };
    case 'inferred':
      return {
        label: 'Guessed — not used for outreach',
        className: BLOCKED,
        explanation: `This address was guessed, not found anywhere. ${NOT_ELIGIBLE_SUFFIX}`,
        confirmable: true,
        eligible: false,
      };
    case 'unknown':
    default:
      return {
        label: 'Unverified (older lead)',
        className: WARN,
        explanation: `LeadForge does not know where this address came from. ${NOT_ELIGIBLE_SUFFIX}`,
        confirmable: true,
        eligible: false,
      };
  }
}

/** Only plain http(s) links are rendered as clickable source links. */
export function safeSourceUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function confirmEmailMessage(email: string, companyName: string): string {
  return [
    `Confirm ${email} as a contact address for ${companyName}?`,
    '',
    'Confirm only if you know this address belongs to this business (for example, they gave it to you).',
    'LeadForge will record your confirmation so the address can be used in future campaigns.',
    'This does not check that the mailbox exists, and no email is sent now.',
  ].join('\n');
}

export const SKIP_REASON_TEXT: Record<string, string> = {
  EMAIL_PROVENANCE_UNVERIFIED: 'Not sent: this email address had not been confirmed as a contact address.',
  RECIPIENT_CHANGED: "Not sent: the lead's email address changed after the campaign started.",
  LEAD_UNAVAILABLE: 'Not sent: the lead is no longer available.',
};

export interface PostClient {
  post: (url: string, body?: unknown) => Promise<{ data: unknown }>;
}

export async function requestConfirmLeadEmail(
  client: PostClient,
  leadId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await client.post(`/leads/${leadId}/confirm-email`, { email });
    return { ok: true };
  } catch (err) {
    const e = err as { response?: { data?: { message?: unknown } } };
    const raw = e?.response?.data?.message;
    return {
      ok: false,
      message: Array.isArray(raw) ? String(raw[0]) : typeof raw === 'string' ? raw : 'Failed to confirm the address. Please try again.',
    };
  }
}
