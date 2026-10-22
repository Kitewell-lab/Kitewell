import { describe, it, expect } from 'vitest';
import { formatClaimableBalanceId, parseClaimableBalanceId } from './claimableBalanceIdFormat.js';

describe('claimableBalanceIdFormat - happy path', () => {
  const validId = '00000000a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('formats 72-hex claimable balance ID with default 8-char prefix, ellipsis, and 8-char suffix', () => {
    const formatted = formatClaimableBalanceId(validId);
    expect(formatted).toBe('00000000…e5f6a1b2');
  });

  it('parses type and hash components accurately', () => {
    const parsed = parseClaimableBalanceId(validId);
    expect(parsed.type).toBe('00000000');
    expect(parsed.hash).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    expect(parsed.full).toBe(validId);
  });
});
