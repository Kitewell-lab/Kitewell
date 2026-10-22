import { describe, it, expect } from 'vitest';
import {
  assertValidPathPaymentHops,
  isValidPathPaymentHops,
  PathHopValidationError
} from './pathPaymentHopValidate.js';

describe('pathPaymentHopValidate - assertValidPathPaymentHops and isValidPathPaymentHops', () => {
  it('isValidPathPaymentHops returns boolean reflecting validity', () => {
    expect(isValidPathPaymentHops([])).toBe(true);
    expect(isValidPathPaymentHops(['native'])).toBe(true);
    expect(isValidPathPaymentHops(null)).toBe(false);
    expect(isValidPathPaymentHops(['native', 'native'])).toBe(false);
  });

  it('assertValidPathPaymentHops succeeds on valid hops', () => {
    const result = assertValidPathPaymentHops(['native']);
    expect(result.valid).toBe(true);
  });

  it('assertValidPathPaymentHops throws PathHopValidationError on invalid hops', () => {
    expect(() => assertValidPathPaymentHops(['native', 'native'])).toThrow(PathHopValidationError);
    expect(() => assertValidPathPaymentHops(null)).toThrow(PathHopValidationError);
  });
});
