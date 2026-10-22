import { describe, it, expect } from 'vitest';
import { formatFeeStats } from './feeStatsFormat.js';

describe('feeStatsFormat - direct stats map', () => {
  it('formats directly provided stats object without top-level category wrapper', () => {
    const directStats = {
      min: 100,
      mode: 150,
      p50: 200,
      max: 500
    };

    const rows = formatFeeStats(directStats);
    expect(rows).toEqual([
      { label: 'min', stroops: 100 },
      { label: 'p50', stroops: 200 },
      { label: 'max', stroops: 500 },
      { label: 'mode', stroops: 150 }
    ]);
  });
});
