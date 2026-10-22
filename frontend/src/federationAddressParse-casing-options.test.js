import { describe, it, expect } from 'vitest';
import { parseFederationAddress } from './federationAddressParse.js';

describe('federationAddressParse - casing options', () => {
  it('normalizes domain to lowercase by default while preserving name casing', () => {
    const result = parseFederationAddress('Alice*STELLAR.ORG');
    expect(result.name).toBe('Alice');
    expect(result.domain).toBe('stellar.org');
  });

  it('normalizes name to lowercase when lowercaseName is true', () => {
    const result = parseFederationAddress('Alice*stellar.org', { lowercaseName: true });
    expect(result.name).toBe('alice');
  });

  it('preserves uppercase domain when lowercaseDomain is false', () => {
    const result = parseFederationAddress('alice*STELLAR.ORG', { lowercaseDomain: false });
    expect(result.domain).toBe('STELLAR.ORG');
  });
});
