import React from 'react';

export const FOUND_VIA_SEARCH_LABEL = 'Found via search';
export const FOUND_VIA_SEARCH_HINT = 'How this lead was discovered. It is your search, not a verified fact about the business.';

/**
 * Discovery context for scraped leads: the search that found the business. Deliberately never
 * labelled "Industry" — the query describes the user's search, not the business.
 */
export function FoundViaSearch({ query, block = false }: { query?: string | null; block?: boolean }) {
  const text = typeof query === 'string' ? query.trim() : '';
  if (!text) return null;
  if (block) {
    return (
      <span className="flex flex-col gap-0.5" data-testid="found-via-search">
        <span className="text-xs font-semibold text-slate-350 truncate" title={text}>
          {text}
        </span>
        <span className="text-4xs text-slate-500">{FOUND_VIA_SEARCH_HINT}</span>
      </span>
    );
  }
  return (
    <span className="block text-4xs text-slate-500 font-normal truncate" title={FOUND_VIA_SEARCH_HINT} data-testid="found-via-search">
      {FOUND_VIA_SEARCH_LABEL}: {text}
    </span>
  );
}
