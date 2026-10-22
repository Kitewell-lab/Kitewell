import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId, InvalidClaimableBalanceIdError } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - invalid length', () => {
  it('throws on ID shorter than 72 characters', () => {
    const tooShort = '00000000a1b2c3d4e5f6';
    expect(() => formatClaimableBalanceId(tooShort)).toThrow(InvalidClaimableBalanceIdError);
  });

  it('throws on ID longer than 72 characters', () => {
    const tooLong = '00000000a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b200';
    expect(() => formatClaimableBalanceId(tooLong)).toThrow(InvalidClaimableBalanceIdError);
  });

  it('throws on empty string', () => {
    expect(() => formatClaimableBalanceId('')).toThrow(InvalidClaimableBalanceIdError);
  });
});
