import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel, DEFAULT_UNKNOWN_OPERATION } from './operationTypeLabel.js';

describe('operationTypeLabel - invalid inputs handling', () => {
  it('returns DEFAULT_UNKNOWN_OPERATION on null or undefined input without throwing', () => {
    expect(resolveOperationTypeLabel(null)).toEqual(DEFAULT_UNKNOWN_OPERATION);
    expect(resolveOperationTypeLabel(undefined)).toEqual(DEFAULT_UNKNOWN_OPERATION);
  });

  it('returns DEFAULT_UNKNOWN_OPERATION on empty string or non-string non-object values', () => {
    expect(resolveOperationTypeLabel('')).toEqual(DEFAULT_UNKNOWN_OPERATION);
    expect(resolveOperationTypeLabel('   ')).toEqual(DEFAULT_UNKNOWN_OPERATION);
    expect(resolveOperationTypeLabel(12345)).toEqual(DEFAULT_UNKNOWN_OPERATION);
    expect(resolveOperationTypeLabel({})).toEqual(DEFAULT_UNKNOWN_OPERATION);
  });
});
