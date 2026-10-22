import { describe, it, expect } from 'vitest';
import { tryFormatFeeStats, isValidFeeStats } from './feeStatsFormat.js';

describe('feeStatsFormat - tryFormatFeeStats and isValidFeeStats', () => {
  const validStats = {
    min: '100',
    max: '200'
  };

  it('isValidFeeStats returns true for valid stats and false for invalid', () => {
    expect(isValidFeeStats(validStats)).toBe(true);
    expect(isValidFeeStats(null)).toBe(false);
    expect(isValidFeeStats({})).toBe(false);
    expect(isValidFeeStats({ min: -50 })).toBe(false);
  });

  it('tryFormatFeeStats formats valid data correctly', () => {
    const rows = tryFormatFeeStats(validStats);
    expect(rows).toEqual([
      { label: 'min', stroops: 100 },
      { label: 'max', stroops: 200 }
    ]);
  });

  it('tryFormatFeeStats returns fallback without throwing on invalid input', () => {
    expect(tryFormatFeeStats(null)).toEqual([]);
    expect(tryFormatFeeStats({}, {}, null)).toBeNull();
    expect(tryFormatFeeStats({ min: 'bad' }, {}, [{ label: 'fallback', stroops: 0 }])).toEqual([
      { label: 'fallback', stroops: 0 }
    ]);
  });
});
