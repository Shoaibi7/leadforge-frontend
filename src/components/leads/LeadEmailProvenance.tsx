import React from 'react';
import { LeadEmailInfo, emailProvenanceDisplay, safeSourceUrl } from '../../lib/lead-email-provenance';

interface Props {
  lead: LeadEmailInfo & { _id: string };
  /** Shows the confirm action for unverified addresses when provided. */
  onConfirm?: () => void;
  confirming?: boolean;
  /** Compact: chip only (explanation in the tooltip). */
  compact?: boolean;
}

/** Where a lead's email came from, whether campaigns may use it, and the confirm action. */
export function LeadEmailProvenance({ lead, onConfirm, confirming = false, compact = false }: Props) {
  const display = emailProvenanceDisplay(lead);
  const sourceUrl = lead.emailSourceType === 'website' ? safeSourceUrl(lead.emailSourceUrl) : null;

  return (
    <span className="inline-flex flex-col gap-1" data-testid="email-provenance">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span
          className={`px-1.5 py-0.5 rounded text-4xs font-semibold uppercase tracking-wide ${display.className}`}
          title={display.explanation}
        >
          {display.label}
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-4xs text-indigo-400 hover:underline"
            title={sourceUrl}
          >
            Source
          </a>
        )}
      </span>
      {!compact && !display.eligible && lead.email && (
        <span className="text-4xs text-slate-500 leading-snug max-w-[260px]">{display.explanation}</span>
      )}
      {display.confirmable && onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="self-start px-2 py-0.5 rounded text-4xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          I confirm this address
        </button>
      )}
    </span>
  );
}
