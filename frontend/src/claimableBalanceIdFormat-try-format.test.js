import { describe, it, expect } from 'vitest';
import { tryFormatClaimableBalanceId, isValidClaimableBalanceId } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - tryFormatClaimableBalanceId and isValidClaimableBalanceId', () => {
  const validId = '00000000a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('isValidClaimableBalanceId accurately detects validity', () => {
    expect(isValidClaimableBalanceId(validId)).toBe(true);
    expect(isValidClaimableBalanceId(`  ${validId}  `)).toBe(true);
    expect(isValidClaimableBalanceId('short')).toBe(false);
    expect(isValidClaimableBalanceId(null)).toBe(false);
  });

  it('tryFormatClaimableBalanceId returns formatted string on valid id', () => {
    expect(tryFormatClaimableBalanceId(validId)).toBe('00000000…e5f6a1b2');
  });

  it('tryFormatClaimableBalanceId returns fallback on invalid id without throwing', () => {
    expect(tryFormatClaimableBalanceId('invalid')).toBe('');
    expect(tryFormatClaimableBalanceId(null, {}, 'N/A')).toBe('N/A');
  });
});
