import { describe, it, expect } from 'vitest';
import { parseFederationAddress } from './federationAddressParse.js';

describe('federationAddressParse - happy path', () => {
  it('parses standard federation address jed*stellar.org', () => {
    const result = parseFederationAddress('jed*stellar.org');
    expect(result.name).toBe('jed');
    expect(result.domain).toBe('stellar.org');
    expect(result.raw).toBe('jed*stellar.org');
  });

  it('parses federation address with subdomains and port', () => {
    const result = parseFederationAddress('alice.smith*pay.example.co.uk:8000');
    expect(result.name).toBe('alice.smith');
    expect(result.domain).toBe('pay.example.co.uk:8000');
  });
});
