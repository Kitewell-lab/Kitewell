import { describe, it, expect } from 'vitest';
import { parseFederationAddress, InvalidFederationAddressError } from './federationAddressParse.js';

describe('federationAddressParse - empty domain component', () => {
  it('throws InvalidFederationAddressError when domain is missing after asterisk', () => {
    expect(() => parseFederationAddress('jed*')).toThrow(InvalidFederationAddressError);
    expect(() => parseFederationAddress('jed*   ')).toThrow(InvalidFederationAddressError);
  });
});
