import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel } from './operationTypeLabel.js';

describe('operationTypeLabel - casing and whitespace tolerance', () => {
  it('tolerates uppercase and mixed-case type strings', () => {
    expect(resolveOperationTypeLabel('PAYMENT')).toEqual({
      label: 'Payment',
      iconId: 'send'
    });

    expect(resolveOperationTypeLabel('Set_Options')).toEqual({
      label: 'Set Options',
      iconId: 'settings'
    });
  });

  it('trims leading and trailing whitespace', () => {
    expect(resolveOperationTypeLabel('  account_merge   ')).toEqual({
      label: 'Account Merge',
      iconId: 'git-merge'
    });
  });
});
