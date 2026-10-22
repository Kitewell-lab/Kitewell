import { describe, it, expect } from 'vitest';
import { formatFeeStats, InvalidFeeStatsError } from './feeStatsFormat.js';

describe('feeStatsFormat - custom keys order', () => {
  const stats = {
    min: 100,
    p50: 250,
    max: 1000
  };

  it('orders rows strictly according to custom keys array', () => {
    const rows = formatFeeStats(stats, { keys: ['max', 'p50', 'min'] });
    expect(rows).toEqual([
      { label: 'max', stroops: 1000 },
      { label: 'p50', stroops: 250 },
      { label: 'min', stroops: 100 }
    ]);
  });

  it('throws when specified custom key is absent in input', () => {
    expect(() => formatFeeStats(stats, { keys: ['min', 'missing_key'] })).toThrow(InvalidFeeStatsError);
  });
});
