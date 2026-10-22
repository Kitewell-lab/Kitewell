import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - custom prefix and suffix lengths', () => {
  const validId = '00000000a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('supports custom prefix and suffix lengths', () => {
    const formatted = formatClaimableBalanceId(validId, {
      prefixLength: 12,
      suffixLength: 4
    });
    expect(formatted).toBe('00000000a1b2…a1b2');
  });

  it('supports 0 suffix length to show only prefix with ellipsis', () => {
    const formatted = formatClaimableBalanceId(validId, {
      prefixLength: 8,
      suffixLength: 0
    });
    expect(formatted).toBe('00000000…');
  });
});
