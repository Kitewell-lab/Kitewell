import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId, InvalidClaimableBalanceIdError } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - non-string inputs', () => {
  it('throws on null and undefined', () => {
    expect(() => formatClaimableBalanceId(null)).toThrow(InvalidClaimableBalanceIdError);
    expect(() => formatClaimableBalanceId(undefined)).toThrow(InvalidClaimableBalanceIdError);
  });

  it('throws on numbers, booleans, and objects', () => {
    expect(() => formatClaimableBalanceId(12345678)).toThrow(InvalidClaimableBalanceIdError);
    expect(() => formatClaimableBalanceId(true)).toThrow(InvalidClaimableBalanceIdError);
    expect(() => formatClaimableBalanceId({})).toThrow(InvalidClaimableBalanceIdError);
  });
});
