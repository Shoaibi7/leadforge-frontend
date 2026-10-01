import React from 'react';
import { canStartCampaign, canStopCampaign } from '../../lib/campaign-status';

interface Props {
  status: string;
  /** True while a start/stop request for this campaign is in flight. */
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}

const spinner = (
  <svg className="animate-spin h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Start / Stop buttons, shown only when the backend state machine allows the action.
 * Terminal campaigns (Completed, Failed, Stopped) get neither.
 */
export function CampaignLifecycleActions({ status, busy, onStart, onStop }: Props) {
  if (canStartCampaign(status)) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
        title="Start Campaign"
        aria-label="Start Campaign"
      >
        {busy ? (
          spinner
        ) : (
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
    );
  }

  if (canStopCampaign(status)) {
    return (
      <button
        type="button"
        onClick={onStop}
        disabled={busy}
        className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-slate-900 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
        title="Stop Campaign"
        aria-label="Stop Campaign"
      >
        {busy ? (
          spinner
        ) : (
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        )}
      </button>
    );
  }

  return null;
}
