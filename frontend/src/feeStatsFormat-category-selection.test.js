import { describe, it, expect } from 'vitest';
import { formatFeeStats } from './feeStatsFormat.js';

describe('feeStatsFormat - category selection', () => {
  const payload = {
    fee_charged: {
      min: '100',
      max: '200'
    },
    max_fee: {
      min: '500',
      max: '1000'
    }
  };

  it('selects fee_charged by default', () => {
    const rows = formatFeeStats(payload);
    expect(rows).toEqual([
      { label: 'min', stroops: 100 },
      { label: 'max', stroops: 200 }
    ]);
  });

  it('selects max_fee when requested in options', () => {
    const rows = formatFeeStats(payload, { category: 'max_fee' });
    expect(rows).toEqual([
      { label: 'min', stroops: 500 },
      { label: 'max', stroops: 1000 }
    ]);
  });
});
