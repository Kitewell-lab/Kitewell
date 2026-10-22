import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops, HOP_ERROR_CODES } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - duplicate consecutive hops', () => {
  const issuer = 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';

  it('rejects consecutive identical native hops', () => {
    const hops = ['native', 'native'];
    const result = validatePathPaymentHops(hops);

    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.DUPLICATE_CONSECUTIVE_HOPS);
  });

  it('rejects consecutive identical credit hops with same code and issuer', () => {
    const hops = [
      `USDC:${issuer}`,
      { code: 'USDC', issuer }
    ];
    const result = validatePathPaymentHops(hops);

    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.DUPLICATE_CONSECUTIVE_HOPS);
  });
});
