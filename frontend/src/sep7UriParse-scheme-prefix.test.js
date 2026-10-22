import { describe, it, expect } from 'vitest';
import { parseSep7Uri } from './sep7UriParse.js';

describe('sep7UriParse - scheme prefix tolerance', () => {
  it('accepts uppercase or mixed-case WEB+STELLAR: scheme prefix', () => {
    const uri = 'WEB+STELLAR:pay?destination=GBB';
    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('pay');
    expect(result.params.destination).toBe('GBB');
  });

  it('accepts double slash format web+stellar://pay?...', () => {
    const uri = 'web+stellar://pay?destination=GCC&amount=50';
    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('pay');
    expect(result.params.destination).toBe('GCC');
    expect(result.params.amount).toBe('50');
  });

  it('trims leading and trailing whitespace by default', () => {
    const uri = '   web+stellar:pay?destination=GDD   ';
    const result = parseSep7Uri(uri);

    expect(result.operation).toBe('pay');
    expect(result.params.destination).toBe('GDD');
  });
});
