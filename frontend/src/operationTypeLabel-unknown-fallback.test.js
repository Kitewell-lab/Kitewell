import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel, DEFAULT_UNKNOWN_OPERATION } from './operationTypeLabel.js';

describe('operationTypeLabel - unknown type fallback', () => {
  it('returns DEFAULT_UNKNOWN_OPERATION for unrecognized operation types', () => {
    const resolved = resolveOperationTypeLabel('future_unknown_op_99');
    expect(resolved).toEqual(DEFAULT_UNKNOWN_OPERATION);
    expect(resolved.label).toBe('Unknown Operation');
    expect(resolved.iconId).toBe('help-circle');
  });
});
