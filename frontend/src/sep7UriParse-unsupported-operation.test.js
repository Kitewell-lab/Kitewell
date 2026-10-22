import { describe, it, expect } from 'vitest';
import { parseSep7Uri, InvalidSep7UriError } from './sep7UriParse.js';

describe('sep7UriParse - unsupported operation', () => {
  it('throws on unrecognized operation type', () => {
    expect(() => parseSep7Uri('web+stellar:invalid_op?param=1')).toThrow(InvalidSep7UriError);
  });

  it('throws when operation name is missing completely', () => {
    expect(() => parseSep7Uri('web+stellar:?param=1')).toThrow(InvalidSep7UriError);
    expect(() => parseSep7Uri('web+stellar:')).toThrow(InvalidSep7UriError);
  });

  it('supports custom allowedOperations whitelist', () => {
    const uri = 'web+stellar:custom_op?key=val';
    const result = parseSep7Uri(uri, { allowedOperations: ['custom_op'] });
    expect(result.operation).toBe('custom_op');
    expect(result.params.key).toBe('val');
  });
});
