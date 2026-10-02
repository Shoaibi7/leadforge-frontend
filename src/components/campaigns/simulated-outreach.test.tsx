import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SimulatedOutreachNotice } from './SimulatedOutreachNotice';
import { DeliveryStatusCell } from './DeliveryStatusCell';
import { SIMULATED_DELIVERY_NOTE, deliveryDisplay } from '../../lib/campaign-status';

afterEach(cleanup);

describe('simulated outreach (outreach email disabled)', () => {
  it('a simulated delivery is labelled "Simulated", never "Delivered"', () => {
    const display = deliveryDisplay({ status: 'Delivered', deliveryStatus: 'sent', simulated: true });
    expect(display.label).toBe('Simulated');
    expect(display.note).toBe(SIMULATED_DELIVERY_NOTE);
  });

  it('a real provider-accepted delivery still shows "Delivered"', () => {
    expect(deliveryDisplay({ status: 'Delivered', deliveryStatus: 'sent' }).label).toBe('Delivered');
  });

  it('the delivery cell explains that nothing was sent', () => {
    render(<DeliveryStatusCell log={{ _id: 'd1', status: 'Delivered', deliveryStatus: 'sent', simulated: true }} />);
    expect(screen.getByText('Simulated')).not.toBeNull();
    expect(screen.queryByText('Delivered')).toBeNull();
    expect(screen.getByText(SIMULATED_DELIVERY_NOTE)).not.toBeNull();
  });

  it('campaign notice states that no email was sent', () => {
    render(<SimulatedOutreachNotice count={3} />);
    expect(screen.getByTestId('simulated-outreach-notice').textContent).toMatch(/3 deliveries were simulated: no email was sent/);
  });

  it.each<number | undefined>([undefined, 0])('no notice when nothing was simulated (%p)', (count) => {
    const { container } = render(<SimulatedOutreachNotice count={count} />);
    expect(container.textContent).toBe('');
  });
});
