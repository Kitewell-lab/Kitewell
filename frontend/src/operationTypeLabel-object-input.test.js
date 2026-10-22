import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel } from './operationTypeLabel.js';

describe('operationTypeLabel - object input support', () => {
  it('extracts type from Horizon operation object payload', () => {
    const opObject = {
      id: '123456789',
      type: 'manage_data',
      name: 'config_key'
    };

    const resolved = resolveOperationTypeLabel(opObject);
    expect(resolved).toEqual({
      label: 'Manage Data',
      iconId: 'database'
    });
  });
});
