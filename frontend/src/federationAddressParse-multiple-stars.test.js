import { describe, it, expect } from 'vitest';
import { parseFederationAddress, InvalidFederationAddressError } from './federationAddressParse.js';

describe('federationAddressParse - multiple star separators', () => {
  it('throws InvalidFederationAddressError when more than one asterisk is present', () => {
    expect(() => parseFederationAddress('alice*bob*stellar.org')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('*name*domain.com')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('name*domain*')).toThrow(InvalidFederationAddressError);
  });
});
