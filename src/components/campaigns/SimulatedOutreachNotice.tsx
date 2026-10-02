import React from 'react';

/**
 * Shown on campaign analytics when deliveries completed in simulation mode (outreach email
 * disabled): makes clear that no email was sent, so the campaign is not mistaken for a real send.
 */
export function SimulatedOutreachNotice({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <div
      role="status"
      data-testid="simulated-outreach-notice"
      className="rounded-2xl border border-zinc-600/40 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300"
    >
      <span className="font-semibold text-zinc-100">Simulation only.</span>{' '}
      {count === 1 ? '1 delivery was' : `${count} deliveries were`} simulated: no email was sent, because
      outreach email is disabled. Simulated deliveries are not counted as sent or delivered.
    </div>
  );
}
