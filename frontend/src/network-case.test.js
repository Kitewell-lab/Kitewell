import { isSupportedNetwork } from '@/networks';

describe('isSupportedNetwork case sensitivity', () => {
  it('should return true for exact case matches (TESTNET, FUTURENET)', () => {
    expect(isSupportedNetwork('TESTNET')).toBe(true);
    expect(isSupportedNetwork('FUTURENET')).toBe(true);
  });

  it('should return false for lowercase or mixed-case variants', () => {
    expect(isSupportedNetwork('testnet')).toBe(false);
    expect(isSupportedNetwork('futurenet')).toBe(false);
    expect(isSupportedNetwork('Futurenet')).toBe(false);
    expect(isSupportedNetwork('TESTnet')).toBe(false);
  });
});