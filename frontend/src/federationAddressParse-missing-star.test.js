import { describe, it, expect } from 'vitest';
import { parseFederationAddress, InvalidFederationAddressError } from './federationAddressParse.js';

describe('federationAddressParse - missing star separator', () => {
  it('throws InvalidFederationAddressError when no asterisk is present', () => {
    expect(() => parseFederationAddress('jed@stellar.org')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('stellar.org')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('onlyname')).toThrow(InvalidFederationAddressError);
  });
});
