import { describe, it, expect } from 'vitest';
import {
  getOperationLabel,
  getOperationIconId,
  isKnownOperationType
} from './operationTypeLabel.js';

describe('operationTypeLabel - helper functions', () => {
  it('getOperationLabel returns label string directly', () => {
    expect(getOperationLabel('payment')).toBe('Payment');
    expect(getOperationLabel('unknown')).toBe('Unknown Operation');
  });

  it('getOperationIconId returns iconId string directly', () => {
    expect(getOperationIconId('payment')).toBe('send');
    expect(getOperationIconId('unknown')).toBe('help-circle');
  });

  it('isKnownOperationType detects registered types', () => {
    expect(isKnownOperationType('payment')).toBe(true);
    expect(isKnownOperationType('create_account')).toBe(true);
    expect(isKnownOperationType('unknown_type')).toBe(false);
    expect(isKnownOperationType(null)).toBe(false);
  });
});
