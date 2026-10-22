import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - non-consecutive duplicate hops allowed', () => {
  const issuer = 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';

  it('allows non-consecutive duplicate assets (e.g. A -> B -> A)', () => {
    const hops = [
      'native',
      `USDC:${issuer}`,
      'native'
    ];

    const result = validatePathPaymentHops(hops);

    expect(result.valid).toBe(true);
    expect(result.count).toBe(3);
  });
});
