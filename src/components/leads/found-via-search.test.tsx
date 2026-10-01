import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FoundViaSearch } from './FoundViaSearch';

afterEach(cleanup);

describe('<FoundViaSearch>', () => {
  it('shows the search as discovery context, never as an industry', () => {
    const { container } = render(<FoundViaSearch query="plumbers in Austin" />);
    expect(screen.getByTestId('found-via-search').textContent).toBe('Found via search: plumbers in Austin');
    expect(container.textContent).not.toMatch(/industry/i);
  });

  it('block form explains that the search is not a verified fact', () => {
    render(<FoundViaSearch query="dentists in Austin" block />);
    expect(screen.getByText('dentists in Austin')).not.toBeNull();
    expect(screen.getByText(/not a verified fact about the business/)).not.toBeNull();
  });

  it.each<string | null | undefined>([undefined, null, '', '   '])('renders nothing for %p (no "undefined" text)', (query) => {
    const { container } = render(<FoundViaSearch query={query} />);
    expect(container.textContent).toBe('');
  });
});
