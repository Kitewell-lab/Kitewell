import { describe, it, expect } from 'vitest';
import { formatFeeStats, InvalidFeeStatsError } from './feeStatsFormat.js';

describe('feeStatsFormat - negative and invalid metric values', () => {
  it('throws on negative numeric fee value', () => {
    expect(() => formatFeeStats({ min: -10 })).toThrow(InvalidFeeStatsError);
  });

  it('throws on non-integer numeric value', () => {
    expect(() => formatFeeStats({ min: 100.5 })).toThrow(InvalidFeeStatsError);
  });

  it('throws on non-digit string value', () => {
    expect(() => formatFeeStats({ min: '100abc' })).toThrow(InvalidFeeStatsError);
    expect(() => formatFeeStats({ min: '-50' })).toThrow(InvalidFeeStatsError);
  });

  it('throws on empty string value', () => {
    expect(() => formatFeeStats({ min: '' })).toThrow(InvalidFeeStatsError);
  });
});
