import { describe, it, expect } from 'vitest';
import { formatFeeStats, InvalidFeeStatsError } from './feeStatsFormat.js';

describe('feeStatsFormat - invalid inputs', () => {
  it('throws InvalidFeeStatsError on null or undefined input', () => {
    expect(() => formatFeeStats(null)).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats(undefined)).toThrow(InvalidFeeStatsError);
  });

  it('throws InvalidFeeStatsError on primitive types or arrays', () => {
    expect(() => formatFeeStats('invalid')).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats(12345)).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats([])).toThrow(InvalidFeeStatsError);
  });

  it('throws InvalidFeeStatsError when object contains no recognized metrics', () => {
    expect(() => formatFeeStats({})).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats({ unrelated: 'data' })).toThrow(InvalidFeeStatsError);
  });
});
