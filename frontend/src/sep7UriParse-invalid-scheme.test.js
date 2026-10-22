import { describe, it, expect } from 'vitest';
import { parseSep7Uri, InvalidSep7UriError } from './sep7UriParse.js';

describe('sep7UriParse - invalid scheme prefix', () => {
  it('throws on standard http or https URLs', () => {
    expect(() => parseSep7Uri('https://example.com/pay')).toThrow(InvalidSep7UriError);
  });

  it('throws on custom scheme without web+stellar:', () => {
    expect(() => parseSep7Uri('stellar:pay?destination=GAA')).toThrow(InvalidSep7UriError);
  });

  it('throws on empty string', () => {
    expect(() => parseSep7Uri('')).toThrow(InvalidSep7UriError);
  });
});
