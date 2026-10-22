import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops, HOP_ERROR_CODES } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - non-array inputs', () => {
  it('returns valid: false when hops is not an array', () => {
    expect(validatePathPaymentHops(null).code).toBe(HOP_ERROR_CODES.NOT_AN_ARRAY);
    expect(validatePathPaymentHops(undefined).code).toBe(HOP_ERROR_CODES.NOT_AN_ARRAY);
    expect(validatePathPaymentHops('native').code).toBe(HOP_ERROR_CODES.NOT_AN_ARRAY);
    expect(validatePathPaymentHops({}).code).toBe(HOP_ERROR_CODES.NOT_AN_ARRAY);
  });
});
