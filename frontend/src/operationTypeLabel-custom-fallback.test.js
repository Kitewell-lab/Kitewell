import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel } from './operationTypeLabel.js';

describe('operationTypeLabel - custom fallback support', () => {
  it('returns user-defined fallback object on unknown type', () => {
    const customFallback = { label: 'Custom Op', iconId: 'custom-icon' };
    const resolved = resolveOperationTypeLabel('unknown_op', { fallback: customFallback });
    expect(resolved).toEqual(customFallback);
  });
});
