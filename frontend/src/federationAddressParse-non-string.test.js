import { describe, it, expect } from 'vitest';
import { parseFederationAddress, InvalidFederationAddressError } from './federationAddressParse.js';

describe('federationAddressParse - non-string and empty inputs', () => {
  it('throws on null and undefined', () => {
    expect(() => parseFederationAddress(null)).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress(undefined)).toThrow(InvalidFederationAddressError);
  });

  it('throws on non-string primitives', () => {
    expect(() => parseFederationAddress(12345)).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress({})).toThrow(InvalidFederationAddressError);
  });

  it('throws on empty string', () => {
    expect(() => parseFederationAddress('')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('   ')).toThrow(InvalidFederationAddressError);
  });
});
