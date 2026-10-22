import { describe, it, expect } from 'vitest';
import { validatePathPaymentHops } from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - empty hops array', () => {
  it('accepts empty hops array (direct payment without intermediate hops)', () => {
    const result = validatePathPaymentHops([]);
    expect(result.valid).toBe(true);
    expect(result.count).toBe(0);
    expect(result.normalizedHops).toEqual([]);
  });
});
