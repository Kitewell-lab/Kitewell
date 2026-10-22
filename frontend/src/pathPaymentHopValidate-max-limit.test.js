import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops, HOP_ERROR_CODES, MAX_PATH_HOPS } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - maximum hops limit', () => {
  const issuer = 'GA5WBPYA5WKBC3HCMAFZ9MA4T5FDJSOHPXWDWQUXQW7H7QNOUV27G5TU';

  it('accepts exactly 5 intermediate hops', () => {
    const hops = [
      'native',
      `A:${issuer}`,
      `B:${issuer}`,
      `C:${issuer}`,
      `D:${issuer}`
    ];
    expect(hops.length).toBe(MAX_PATH_HOPS);

    const result = validatePathPaymentHops(hops);
    expect(result.valid).toBe(true);
    expect(result.count).toBe(5);
  });

  it('rejects 6 intermediate hops with EXCEEDS_MAX_HOPS code', () => {
    const hops = [
      'native',
      `A:${issuer}`,
      `B:${issuer}`,
      `C:${issuer}`,
      `D:${issuer}`,
      `E:${issuer}`
    ];

    const result = validatePathPaymentHops(hops);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(HOP_ERROR_CODES.EXCEEDS_MAX_HOPS);
  });
});
