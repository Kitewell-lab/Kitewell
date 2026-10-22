import { describe, it, expect } from 'vitest';
import { tryParseFederationAddress, isValidFederationAddress } from './federationAddressParse.js';

describe('federationAddressParse - tryParseFederationAddress and isValidFederationAddress', () => {
  const validAddress = 'bob*example.com';

  it('isValidFederationAddress returns true for valid address and false for invalid', () => {
    expect(isValidFederationAddress(validAddress)).toBe(true);
    expect(isValidFederationAddress('invalid_address')).toBe(false);
    expect(isValidFederationAddress(null)).toBe(false);
    expect(isValidFederationAddress('*domain.com')).toBe(false);
  });

  it('tryParseFederationAddress returns parsed object on success', () => {
    const result = tryParseFederationAddress(validAddress);
    expect(result.name).toBe('bob');
    expect(result.domain).toBe('example.com');
  });

  it('tryParseFederationAddress returns fallback on error without throwing', () => {
    expect(tryParseFederationAddress('invalid')).toBeNull();
    expect(tryParseFederationAddress(null, {}, { fallback: true })).toEqual({ fallback: true });
  });
});
