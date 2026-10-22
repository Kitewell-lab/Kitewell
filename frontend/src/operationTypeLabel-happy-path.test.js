import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel } from './operationTypeLabel.js';

describe('operationTypeLabel - happy path', () => {
  it('maps common core operation types to correct labels and icon IDs', () => {
    expect(resolveOperationTypeLabel('payment')).toEqual({
      label: 'Payment',
      iconId: 'send'
    });

    expect(resolveOperationTypeLabel('create_account')).toEqual({
      label: 'Create Account',
      iconId: 'user-plus'
    });

    expect(resolveOperationTypeLabel('change_trust')).toEqual({
      label: 'Change Trust',
      iconId: 'shield-check'
    });
  });
});
