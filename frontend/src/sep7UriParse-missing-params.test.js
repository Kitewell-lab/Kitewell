import { describe, it, expect } from 'vitest';
import { parseSep7Uri } from './sep7UriParse.js';

describe('sep7UriParse - missing or empty query params', () => {
  it('parses valid operation with no query parameters as empty params object', () => {
    const uri = 'web+stellar:pay';
    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('pay');
    expect(result.params).toEqual({});
  });

  it('parses operation ending with question mark and no params', () => {
    const uri = 'web+stellar:tx?';
    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('tx');
    expect(result.params).toEqual({});
  });
});
