import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - happy path', () => {
  const issuer1 = 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';
  const issuer2 = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  it('validates a valid multi-hop path payment route', () => {
    const hops = [
      'native',
      `USDC:${issuer1}`,
      { code: 'EURT', issuer: issuer2 }
    ];

    const result = validatePathPaymentHops(hops);

    expect(result.valid).toBe(true);
    expect(result.count).toBe(3);
    expect(result.normalizedHops).toEqual([
      'native',
      `USDC:${issuer1}`,
      `EURT:${issuer2}`
    ]);
  });
});
