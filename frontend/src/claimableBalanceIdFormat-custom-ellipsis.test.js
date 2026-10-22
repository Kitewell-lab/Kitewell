import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - custom ellipsis and casing', () => {
  const validId = '00000000A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2';

  it('supports custom three-dot ellipsis string', () => {
    const formatted = formatClaimableBalanceId(validId, { ellipsis: '...' });
    expect(formatted).toBe('00000000...e5f6a1b2');
  });

  it('preserves uppercase when lowercase option is set to false', () => {
    const formatted = formatClaimableBalanceId(validId, { lowercase: false });
    expect(formatted).toBe('00000000…E5F6A1B2');
  });
});
