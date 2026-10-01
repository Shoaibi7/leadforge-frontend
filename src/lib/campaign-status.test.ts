import { describe, expect, it, vi } from 'vitest';
import {
  CAMPAIGN_STATUS_STYLES,
  REQUIRES_REVIEW_MESSAGE,
  RESOLVE_CONFIRMATION_MESSAGES,
  STOP_CONFIRMATION_MESSAGE,
  UNCERTAIN_DELIVERY_EXPLANATION,
  canDeleteCampaign,
  canStartCampaign,
  canStopCampaign,
  createSingleFlight,
  deliveryDisplay,
  requestResolveDelivery,
  requestStopCampaign,
} from './campaign-status';

describe('campaign actions mirror the backend state machine', () => {
  it.each([
    ['Draft', true, false, true],
    ['Scheduled', true, false, true],
    ['Running', false, true, false],
    ['Completed', false, false, true],
    ['Failed', false, false, true],
    ['Stopped', false, false, true],
  ])('%s: start=%s stop=%s delete=%s', (status, start, stop, del) => {
    expect(canStartCampaign(status)).toBe(start);
    expect(canStopCampaign(status)).toBe(stop);
    expect(canDeleteCampaign(status)).toBe(del);
  });
});

describe('wording', () => {
  it('uses LeadForge branding', () => {
    for (const text of [REQUIRES_REVIEW_MESSAGE, UNCERTAIN_DELIVERY_EXPLANATION, ...Object.values(RESOLVE_CONFIRMATION_MESSAGES)]) {
      expect(text).not.toMatch(/HireSignal/i);
    }
    expect(UNCERTAIN_DELIVERY_EXPLANATION).toBe(
      'The email may have been accepted by the mail provider, but LeadForge could not confirm the final result. It was not automatically sent again.',
    );
  });

  it('review messages never claim the email definitely failed or definitely sent', () => {
    for (const text of [REQUIRES_REVIEW_MESSAGE, UNCERTAIN_DELIVERY_EXPLANATION]) {
      expect(text).not.toMatch(/\b(definitely|was delivered|has failed|was not delivered)\b/i);
      expect(text).toMatch(/could not confirm/i);
    }
  });

  it('the stop confirmation explains cancellation and the in-flight email', () => {
    expect(STOP_CONFIRMATION_MESSAGE).toMatch(/not been sent yet will be cancelled/);
    expect(STOP_CONFIRMATION_MESSAGE).toMatch(/being sent at this moment may still complete/);
  });

  it('resolution confirmations state that nothing is sent', () => {
    expect(RESOLVE_CONFIRMATION_MESSAGES.treat_as_sent).toMatch(/will not send the email again/);
    expect(RESOLVE_CONFIRMATION_MESSAGES.treat_as_failed).toMatch(/will not resend the email/);
  });

  it('every campaign status has its own (non-default) style, including Stopped', () => {
    const classes = Object.values(CAMPAIGN_STATUS_STYLES).map((s) => s.className);
    expect(new Set(classes).size).toBe(classes.length);
    expect(CAMPAIGN_STATUS_STYLES.Stopped.label).toBe('Stopped');
  });
});

describe('deliveryDisplay', () => {
  it('shows uncertain deliveries distinctly from every other state', () => {
    const uncertain = deliveryDisplay({ status: 'Uncertain', deliveryStatus: 'uncertain' });
    expect(uncertain).toMatchObject({ kind: 'uncertain', label: 'Unconfirmed', note: UNCERTAIN_DELIVERY_EXPLANATION });
    for (const deliveryStatus of ['sent', 'failed', 'pending', 'cancelled', 'skipped'] as const) {
      const other = deliveryDisplay({ status: 'x', deliveryStatus });
      expect(other.label).not.toBe(uncertain.label);
      expect(other.className).not.toBe(uncertain.className);
    }
  });

  it('keeps engagement labels for sent deliveries and marks manual decisions', () => {
    expect(deliveryDisplay({ status: 'Clicked', deliveryStatus: 'sent' }).label).toBe('Clicked');
    expect(deliveryDisplay({ status: 'Delivered', deliveryStatus: 'sent', resolution: 'treat_as_sent' }).note).toMatch(
      /Marked as sent by you/,
    );
    expect(deliveryDisplay({ status: 'Failed', deliveryStatus: 'failed', resolution: 'treat_as_failed' }).note).toBe(
      'Marked as failed by you.',
    );
  });
});

describe('requestStopCampaign', () => {
  it('posts to the stop endpoint', async () => {
    const post = vi.fn().mockResolvedValue({ data: { status: 'Stopped', cancelledDeliveries: 2 } });
    expect(await requestStopCampaign({ post }, 'c1')).toEqual({ ok: true, data: { status: 'Stopped', cancelledDeliveries: 2 } });
    expect(post).toHaveBeenCalledWith('/campaigns/c1/stop');
  });

  it('turns a 409 into a readable message instead of throwing', async () => {
    const post = vi.fn().mockRejectedValue({
      response: { status: 409, data: { message: 'Campaign cannot be stopped because it is Completed' } },
    });
    expect(await requestStopCampaign({ post }, 'c1')).toEqual({
      ok: false,
      status: 409,
      message: 'Campaign cannot be stopped because it is Completed',
    });
  });

  it('falls back to a generic message on network errors', async () => {
    const post = vi.fn().mockRejectedValue(new Error('Network Error'));
    const result = await requestStopCampaign({ post }, 'c1');
    expect(result).toMatchObject({ ok: false, message: 'Failed to stop the campaign. Please try again.' });
  });
});

describe('requestResolveDelivery', () => {
  it('posts the decision to the owner-scoped resolve endpoint', async () => {
    const post = vi.fn().mockResolvedValue({ data: {} });
    await requestResolveDelivery({ post }, 'c1', 'd1', 'treat_as_failed');
    expect(post).toHaveBeenCalledWith('/campaigns/c1/deliveries/d1/resolve', { decision: 'treat_as_failed' });
  });
});

describe('createSingleFlight', () => {
  it('prevents double submission of the same action', async () => {
    const guard = createSingleFlight();
    let release!: () => void;
    const work = vi.fn(() => new Promise<string>((r) => (release = () => r('done'))));
    const first = guard.run('stop:c1', work);
    const second = guard.run('stop:c1', work);
    expect(guard.isRunning('stop:c1')).toBe(true);
    release();
    expect(await first).toBe('done');
    expect(await second).toBeUndefined();
    expect(work).toHaveBeenCalledTimes(1);
    expect(guard.isRunning('stop:c1')).toBe(false);
  });

  it('does not block different keys and frees the key after a failure', async () => {
    const guard = createSingleFlight();
    await expect(guard.run('a', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await guard.run('a', async () => 1)).toBe(1);
    expect(await Promise.all([guard.run('x', async () => 'x'), guard.run('y', async () => 'y')])).toEqual(['x', 'y']);
  });
});
