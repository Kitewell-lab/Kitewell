import { describe, it, expect } from 'vitest';
import { tryParseSep7Uri, isValidSep7Uri } from './sep7UriParse.js';

describe('sep7UriParse - tryParseSep7Uri and isValidSep7Uri', () => {
  const validUri = 'web+stellar:pay?destination=GABC&amount=10';

  it('isValidSep7Uri returns true for valid SEP-7 URIs', () => {
    expect(isValidSep7Uri(validUri)).toBe(true);
    expect(isValidSep7Uri('web+stellar:tx?xdr=abc')).toBe(true);
  });

  it('isValidSep7Uri returns false for invalid URIs', () => {
    expect(isValidSep7Uri('https://example.com')).toBe(false);
    expect(isValidSep7Uri(null)).toBe(false);
    expect(isValidSep7Uri('')).toBe(false);
  });

  it('tryParseSep7Uri returns parsed result on success', () => {
    const parsed = tryParseSep7Uri(validUri);
    expect(parsed.operation).toBe('pay');
    expect(parsed.params.destination).toBe('GABC');
  });

  it('tryParseSep7Uri returns fallback on error without throwing', () => {
    expect(tryParseSep7Uri('invalid')).toBeNull();
    expect(tryParseSep7Uri(null, {}, { custom: 'fallback' })).toEqual({ custom: 'fallback' });
  });
});
