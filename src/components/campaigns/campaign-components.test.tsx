import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CampaignLifecycleActions } from './CampaignLifecycleActions';
import { CampaignStatusBadge, RequiresReviewNotice } from './CampaignStatusBadge';
import { DeliveryStatusCell } from './DeliveryStatusCell';
import { CAMPAIGN_STATUS_STYLES, UNCERTAIN_DELIVERY_EXPLANATION } from '../../lib/campaign-status';

afterEach(cleanup);

const noop = () => undefined;

describe('CampaignLifecycleActions', () => {
  it.each(['Draft', 'Scheduled'])('%s: shows Start, not Stop', (status) => {
    render(<CampaignLifecycleActions status={status} busy={false} onStart={noop} onStop={noop} />);
    expect(screen.queryByRole('button', { name: 'Start Campaign' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Stop Campaign' })).toBeNull();
  });

  it('Running: shows Stop, not Start', () => {
    render(<CampaignLifecycleActions status="Running" busy={false} onStart={noop} onStop={noop} />);
    expect(screen.queryByRole('button', { name: 'Stop Campaign' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Start Campaign' })).toBeNull();
  });

  it.each(['Completed', 'Failed', 'Stopped'])('%s (terminal): offers neither Start nor Stop', (status) => {
    const { container } = render(<CampaignLifecycleActions status={status} busy={false} onStart={noop} onStop={noop} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('Stop calls the handler; the button is disabled while a request is in flight', () => {
    const onStop = vi.fn();
    const { rerender } = render(<CampaignLifecycleActions status="Running" busy={false} onStart={noop} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop Campaign' }));
    expect(onStop).toHaveBeenCalledTimes(1);

    rerender(<CampaignLifecycleActions status="Running" busy onStart={noop} onStop={onStop} />);
    const button = screen.getByRole('button', { name: 'Stop Campaign' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe('CampaignStatusBadge', () => {
  it.each(Object.keys(CAMPAIGN_STATUS_STYLES))('renders %s with its own style', (status) => {
    render(<CampaignStatusBadge status={status} />);
    const badge = screen.getByTestId('campaign-status');
    expect(badge.textContent).toBe(status);
    expect(badge.className).toContain(CAMPAIGN_STATUS_STYLES[status as keyof typeof CAMPAIGN_STATUS_STYLES].className);
  });

  it('shows a Needs review badge only when requiresReview is true', () => {
    const { rerender } = render(<CampaignStatusBadge status="Completed" />);
    expect(screen.queryByTestId('campaign-review-badge')).toBeNull();
    rerender(<CampaignStatusBadge status="Completed" requiresReview />);
    const badge = screen.getByTestId('campaign-review-badge');
    expect(badge.textContent).toBe('Needs review');
    expect(badge.getAttribute('title')).toMatch(/could not confirm/);
  });
});

describe('RequiresReviewNotice', () => {
  it('explains the situation without claiming failure or success', () => {
    render(<RequiresReviewNotice uncertainCount={2} />);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toMatch(/could not confirm the outcome of one or more emails/);
    expect(notice.textContent).toMatch(/2 emails need your review/);
    expect(notice.textContent).not.toMatch(/definitely|has failed|was delivered/i);
  });
});

describe('DeliveryStatusCell', () => {
  const uncertainLog = {
    _id: 'd1',
    status: 'Uncertain',
    deliveryStatus: 'uncertain' as const,
    resolvable: true,
    errorMessage: 'ECONNRESET during DATA; acceptance unknown',
  };

  it('renders an uncertain delivery distinctly with the LeadForge explanation and no provider error text', () => {
    render(<DeliveryStatusCell log={uncertainLog} onResolve={noop} />);
    expect(screen.getByTestId('delivery-status-uncertain')).not.toBeNull();
    expect(screen.getByText('Unconfirmed')).not.toBeNull();
    expect(screen.getByText(UNCERTAIN_DELIVERY_EXPLANATION)).not.toBeNull();
    expect(screen.queryByText(/ECONNRESET/)).toBeNull();
  });

  it('offers exactly two record-only decisions and passes them through', () => {
    const onResolve = vi.fn();
    render(<DeliveryStatusCell log={uncertainLog} onResolve={onResolve} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as sent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as failed' }));
    expect(onResolve.mock.calls).toEqual([
      ['d1', 'treat_as_sent'],
      ['d1', 'treat_as_failed'],
    ]);
    expect(screen.queryByRole('button', { name: /resend|retry/i })).toBeNull();
  });

  it('disables the decisions while a resolution is in flight', () => {
    render(<DeliveryStatusCell log={uncertainLog} onResolve={noop} resolving />);
    for (const name of ['Mark as sent', 'Mark as failed']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('does not offer resolution for legacy (non-resolvable) uncertain rows', () => {
    render(<DeliveryStatusCell log={{ ...uncertainLog, resolvable: false }} onResolve={noop} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(UNCERTAIN_DELIVERY_EXPLANATION)).not.toBeNull();
  });

  it.each([
    ['sent', 'Delivered', 'Delivered'],
    ['failed', 'Failed', 'Failed'],
    ['pending', 'Pending', 'Pending'],
    ['cancelled', 'Cancelled', 'Cancelled'],
    ['skipped', 'Skipped', 'Skipped'],
  ] as const)('%s deliveries render as %s with no resolution buttons', (deliveryStatus, status, label) => {
    render(<DeliveryStatusCell log={{ _id: 'x', status, deliveryStatus, resolvable: false }} onResolve={noop} />);
    expect(screen.getByTestId(`delivery-status-${deliveryStatus}`)).not.toBeNull();
    expect(screen.getByText(label)).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the operator decision on a resolved delivery', () => {
    render(
      <DeliveryStatusCell
        log={{ _id: 'x', status: 'Delivered', deliveryStatus: 'sent', resolution: 'treat_as_sent', resolvable: false }}
      />,
    );
    expect(screen.getByText(/Marked as sent by you/)).not.toBeNull();
  });
});
