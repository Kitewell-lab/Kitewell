import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - boundary lengths', () => {
  const validId = '00000000a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('returns full string without ellipsis when prefix + suffix equals 72', () => {
    const formatted = formatClaimableBalanceId(validId, {
      prefixLength: 36,
      suffixLength: 36
    });
    expect(formatted).toBe(validId);
  });

  it('returns full string when prefix + suffix exceeds 72', () => {
    const formatted = formatClaimableBalanceId(validId, {
      prefixLength: 40,
      suffixLength: 40
    });
    expect(formatted).toBe(validId);
  });

  it('throws RangeError when prefixLength or suffixLength is negative', () => {
    expect(() => formatClaimableBalanceId(validId, { prefixLength: -1 })).toThrow(RangeError);
    expect(() => formatClaimableBalanceId(validId, { suffixLength: -2 })).toThrow(RangeError);
  });
});
