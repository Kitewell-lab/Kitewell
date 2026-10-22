import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId, InvalidClaimableBalanceIdError } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - invalid characters', () => {
  it('throws on non-hex characters (e.g. g-z)', () => {
    const invalidHex = '00000000z1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    expect(() => formatClaimableBalanceId(invalidHex)).toThrow(InvalidClaimableBalanceIdError);
  });

  it('throws on special characters or whitespace inside ID', () => {
    const withSpecial = '00000000-1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    expect(() => formatClaimableBalanceId(withSpecial)).toThrow(InvalidClaimableBalanceIdError);
  });
});
