import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LeadEmailProvenance } from './LeadEmailProvenance';
import {
  confirmEmailMessage,
  emailProvenanceDisplay,
  requestConfirmLeadEmail,
  safeSourceUrl,
} from '../../lib/lead-email-provenance';
import { deliveryDisplay } from '../../lib/campaign-status';

afterEach(cleanup);

const base = { _id: 'l1', email: 'info@acme.example' };

describe('emailProvenanceDisplay', () => {
  it.each([
    [{ emailSourceType: 'website', emailOutreachEligible: true }, 'Found on website', true, false],
    [{ emailSourceType: 'manual', emailSourceMethod: 'user_entry', emailOutreachEligible: true }, 'Entered by you', true, false],
    [{ emailSourceType: 'manual', emailSourceMethod: 'operator_confirmation', emailOutreachEligible: true }, 'Confirmed by you', true, false],
    [{ emailSourceType: 'imported', emailOutreachEligible: true }, 'Imported', true, false],
    [{ emailSourceType: 'unknown', emailOutreachEligible: false }, 'Unverified (older lead)', false, true],
    [{ emailSourceType: 'inferred', emailOutreachEligible: false }, 'Guessed — not used for outreach', false, true],
  ] as const)('%o -> %s', (fields, label, eligible, confirmable) => {
    const d = emailProvenanceDisplay({ ...base, ...fields });
    expect(d).toMatchObject({ label, eligible, confirmable });
  });

  it('a missing source is treated as unverified, never as website', () => {
    expect(emailProvenanceDisplay({ email: 'x@y.example' }).label).toBe('Unverified (older lead)');
  });

  it('the backend verdict wins: an "eligible" label is never shown for an inferred address', () => {
    expect(emailProvenanceDisplay({ ...base, emailSourceType: 'inferred', emailOutreachEligible: true }).eligible).toBe(false);
  });

  it('no email: explains that LeadForge does not guess addresses', () => {
    expect(emailProvenanceDisplay({})).toMatchObject({ label: 'No email found', confirmable: false });
    expect(emailProvenanceDisplay({}).explanation).toMatch(/does not guess/);
  });
});

describe('safeSourceUrl', () => {
  it('allows only http(s) links', () => {
    expect(safeSourceUrl('https://acme.example/contact')).toBe('https://acme.example/contact');
    expect(safeSourceUrl('http://acme.example/')).toBe('http://acme.example/');
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
    expect(safeSourceUrl('data:text/html,hi')).toBeNull();
    expect(safeSourceUrl('not a url')).toBeNull();
    expect(safeSourceUrl(undefined)).toBeNull();
  });
});

describe('confirmation wording', () => {
  it('is precise: a confirmation, not a mailbox verification, and nothing is sent', () => {
    const text = confirmEmailMessage('info@acme.example', 'Acme');
    expect(text).toMatch(/Confirm info@acme\.example as a contact address for Acme\?/);
    expect(text).toMatch(/does not check that the mailbox exists/);
    expect(text).toMatch(/no email is sent now/);
    expect(text).not.toMatch(/verified/i);
  });
});

describe('requestConfirmLeadEmail', () => {
  it('posts the address the user saw', async () => {
    const post = vi.fn().mockResolvedValue({ data: {} });
    expect(await requestConfirmLeadEmail({ post }, 'l1', 'info@acme.example')).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('/leads/l1/confirm-email', { email: 'info@acme.example' });
  });

  it('returns the server message on conflict', async () => {
    const post = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: 'The lead email changed.' } } });
    expect(await requestConfirmLeadEmail({ post }, 'l1', 'x@y.example')).toEqual({ ok: false, message: 'The lead email changed.' });
  });
});

describe('<LeadEmailProvenance>', () => {
  it('website: shows the label and a safe Source link to the page where it was found', () => {
    render(
      <LeadEmailProvenance
        lead={{ ...base, emailSourceType: 'website', emailSourceUrl: 'https://acme.example/contact', emailOutreachEligible: true }}
      />,
    );
    expect(screen.getByText('Found on website')).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Source' });
    expect(link.getAttribute('href')).toBe('https://acme.example/contact');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('never renders a non-http source URL as a link', () => {
    render(<LeadEmailProvenance lead={{ ...base, emailSourceType: 'website', emailSourceUrl: 'javascript:alert(1)', emailOutreachEligible: true }} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('unverified legacy address: explains why it is not used and offers the confirm action', () => {
    const onConfirm = vi.fn();
    render(<LeadEmailProvenance lead={{ ...base, emailSourceType: 'unknown', emailOutreachEligible: false }} onConfirm={onConfirm} />);
    expect(screen.getByText('Unverified (older lead)')).not.toBeNull();
    expect(screen.getByText(/will not send campaign emails to it until you confirm it/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'I confirm this address' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('the confirm action is disabled while a confirmation is in flight', () => {
    render(<LeadEmailProvenance lead={{ ...base, emailSourceType: 'inferred', emailOutreachEligible: false }} onConfirm={() => undefined} confirming />);
    expect((screen.getByRole('button', { name: 'I confirm this address' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('eligible addresses offer no confirm action', () => {
    render(<LeadEmailProvenance lead={{ ...base, emailSourceType: 'manual', emailOutreachEligible: true }} onConfirm={() => undefined} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('no email: nothing to confirm', () => {
    render(<LeadEmailProvenance lead={{ _id: 'l2' }} onConfirm={() => undefined} />);
    expect(screen.getByText('No email found')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('skipped deliveries explain the reason', () => {
  it.each([
    ['EMAIL_PROVENANCE_UNVERIFIED', /had not been confirmed as a contact address/],
    ['RECIPIENT_CHANGED', /changed after the campaign started/],
    ['LEAD_UNAVAILABLE', /no longer available/],
  ])('%s', (skipReason, text) => {
    expect(deliveryDisplay({ status: 'Skipped', deliveryStatus: 'skipped', skipReason }).note).toMatch(text);
  });
});
