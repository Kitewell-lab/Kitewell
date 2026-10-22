import { describe, it, expect } from 'vitest';
import { parseSep7Uri, InvalidSep7UriError } from './sep7UriParse.js';

describe('sep7UriParse - non-string inputs', () => {
  it('throws on null and undefined', () => {
    expect(() => parseSep7Uri(null)).toThrow(InvalidSep7UriError);
    expect(() => parseSep7Uri(undefined)).toThrow(InvalidSep7UriError);
  });

  it('throws on numbers, booleans, and objects', () => {
    expect(() => parseSep7Uri(12345)).toThrow(InvalidSep7UriError);
    expect(() => parseSep7Uri(true)).toThrow(InvalidSep7UriError);
    expect(() => parseSep7Uri({})).toThrow(InvalidSep7UriError);
  });
});
