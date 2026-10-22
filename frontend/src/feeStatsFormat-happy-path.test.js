import { describe, it, expect } from 'vitest';
import { formatFeeStats, DEFAULT_FEE_STAT_KEYS } from './feeStatsFormat.js';

describe('feeStatsFormat - happy path', () => {
  const sampleHorizonResponse = {
    last_ledger: '1000',
    last_ledger_base_fee: '100',
    ledger_capacity_usage: '0.12',
    fee_charged: {
      min: '100',
      mode: '100',
      p10: '100',
      p20: '120',
      p30: '130',
      p40: '140',
      p50: '150',
      p60: '160',
      p70: '170',
      p80: '180',
      p90: '200',
      p95: '250',
      p99: '500',
      max: '1000'
    }
  };

  it('formats full Horizon fee_stats into ordered array of { label, stroops }', () => {
    const rows = formatFeeStats(sampleHorizonResponse);

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(14);

    expect(rows.map((r) => r.label)).toEqual(DEFAULT_FEE_STAT_KEYS);
    expect(rows[0]).toEqual({ label: 'min', stroops: 100 });
    expect(rows[1]).toEqual({ label: 'p10', stroops: 100 });
    expect(rows[5]).toEqual({ label: 'p50', stroops: 150 });
    expect(rows[6]).toEqual({ label: 'p60', stroops: 160 });
    expect(rows[12]).toEqual({ label: 'max', stroops: 1000 });
    expect(rows[13]).toEqual({ label: 'mode', stroops: 100 });
  });
});
