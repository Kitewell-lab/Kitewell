import { describe, it, expect } from 'vitest';
import { formatFeeStats } from './feeStatsFormat.js';

describe('feeStatsFormat - filter and output formatting options', () => {
  const stats = {
    min: '100',
    mode: '150',
    p50: '200',
    max: '500'
  };

  it('excludes mode when includeMode is false', () => {
    const rows = formatFeeStats(stats, { includeMode: false });
    expect(rows.some((r) => r.label === 'mode')).toBe(false);
    expect(rows.length).toBe(3);
  });

  it('excludes min and max when includeMinMax is false', () => {
    const rows = formatFeeStats(stats, { includeMinMax: false });
    expect(rows.some((r) => r.label === 'min')).toBe(false);
    expect(rows.some((r) => r.label === 'max')).toBe(false);
    expect(rows).toEqual([
      { label: 'p50', stroops: 200 },
      { label: 'mode', stroops: 150 }
    ]);
  });

  it('preserves string values when asNumber is false', () => {
    const rows = formatFeeStats(stats, { asNumber: false });
    expect(rows[0]).toEqual({ label: 'min', stroops: '100' });
    expect(typeof rows[0].stroops).toBe('string');
  });
});
