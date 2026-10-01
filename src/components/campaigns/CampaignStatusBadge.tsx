import React from 'react';
import { REQUIRES_REVIEW_MESSAGE, REQUIRES_REVIEW_TITLE, campaignStatusStyle } from '../../lib/campaign-status';

interface Props {
  status: string;
  requiresReview?: boolean;
  /** Extra classes for size / spacing so each page keeps its existing look. */
  sizeClassName?: string;
}

/** Campaign status chip, plus a "Needs review" chip when delivery outcomes are unconfirmed. */
export function CampaignStatusBadge({
  status,
  requiresReview,
  sizeClassName = 'px-2.5 py-0.5 text-2xs',
}: Props) {
  const style = campaignStatusStyle(status);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`${sizeClassName} rounded-full font-semibold uppercase tracking-wider ${style.className}`}
        title={style.description}
        data-testid="campaign-status"
      >
        {style.label}
      </span>
      {requiresReview && (
        <span
          className={`${sizeClassName} rounded-full font-semibold uppercase tracking-wider bg-yellow-950/40 text-yellow-300 border border-yellow-600/40`}
          title={REQUIRES_REVIEW_MESSAGE}
          data-testid="campaign-review-badge"
        >
          {REQUIRES_REVIEW_TITLE}
        </span>
      )}
    </span>
  );
}

/** Full explanation shown where there is room (campaign analytics). */
export function RequiresReviewNotice({ uncertainCount }: { uncertainCount?: number }) {
  return (
    <div
      role="status"
      className="bg-yellow-950/20 border border-yellow-700/40 rounded-xl p-4 text-xs text-yellow-200 space-y-1"
    >
      <p className="font-bold uppercase tracking-wider text-yellow-300">{REQUIRES_REVIEW_TITLE}</p>
      <p>{REQUIRES_REVIEW_MESSAGE}</p>
      {typeof uncertainCount === 'number' && uncertainCount > 0 && (
        <p className="text-yellow-300/80">
          {uncertainCount} {uncertainCount === 1 ? 'email needs' : 'emails need'} your review below.
        </p>
      )}
    </div>
  );
}
