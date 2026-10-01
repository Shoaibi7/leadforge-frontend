import React from 'react';
import { DeliveryLogLike, ResolutionDecision, deliveryDisplay } from '../../lib/campaign-status';

interface Props {
  log: DeliveryLogLike & { _id: string; errorMessage?: string };
  /** Present only where the operator may resolve uncertain deliveries. */
  onResolve?: (deliveryId: string, decision: ResolutionDecision) => void;
  /** True while a resolution request for this delivery is in flight. */
  resolving?: boolean;
}

/**
 * Delivery status for one recipient. Uncertain deliveries are shown distinctly with a plain
 * explanation (never provider error text) and, when resolvable, two record-only decisions.
 */
export function DeliveryStatusCell({ log, onResolve, resolving = false }: Props) {
  const display = deliveryDisplay(log);
  const canResolve = display.kind === 'uncertain' && !!log.resolvable && !!onResolve;

  return (
    <div className="space-y-1" data-testid={`delivery-status-${display.kind}`}>
      <span className={`px-2 py-0.5 rounded text-4xs font-semibold uppercase ${display.className}`}>
        {display.label}
      </span>

      {display.kind === 'failed' && !log.resolution && log.errorMessage && (
        <span className="text-red-400 block text-4xs font-mono truncate max-w-[220px]" title={log.errorMessage}>
          {log.errorMessage}
        </span>
      )}

      {display.note && (
        <p
          className={`text-4xs leading-snug max-w-[260px] ${
            display.kind === 'uncertain' ? 'text-yellow-200/90' : 'text-slate-500'
          }`}
        >
          {display.note}
        </p>
      )}

      {canResolve && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            type="button"
            disabled={resolving}
            onClick={() => onResolve!(log._id, 'treat_as_sent')}
            className="px-2 py-0.5 rounded text-4xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Mark as sent
          </button>
          <button
            type="button"
            disabled={resolving}
            onClick={() => onResolve!(log._id, 'treat_as_failed')}
            className="px-2 py-0.5 rounded text-4xs font-semibold bg-slate-900 hover:bg-slate-800 text-red-300 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Mark as failed
          </button>
        </div>
      )}
    </div>
  );
}
