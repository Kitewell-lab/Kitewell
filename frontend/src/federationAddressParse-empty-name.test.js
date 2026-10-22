import { describe, it, expect } from 'vitest';
import { parseFederationAddress, InvalidFederationAddressError } from './federationAddressParse.js';

describe('federationAddressParse - empty name component', () => {
  it('throws InvalidFederationAddressError when name is missing before asterisk', () => {
    expect(() => parseFederationAddress('*stellar.org')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('   *stellar.org')).toThrow(InvalidFederationAddressError);
  });
});
