import { describe, it, expect } from 'vitest';
import { resolveOperationTypeLabel } from './operationTypeLabel.js';

describe('operationTypeLabel - smart contract and claimable balance operations', () => {
  it('maps Soroban invoke_host_function to Invoke Contract', () => {
    const resolved = resolveOperationTypeLabel('invoke_host_function');
    expect(resolved).toEqual({
      label: 'Invoke Contract',
      iconId: 'cpu'
    });
  });

  it('maps claimable balance and liquidity pool operations', () => {
    expect(resolveOperationTypeLabel('create_claimable_balance').label).toBe('Create Claimable Balance');
    expect(resolveOperationTypeLabel('claim_claimable_balance').label).toBe('Claim Claimable Balance');
    expect(resolveOperationTypeLabel('liquidity_pool_deposit').label).toBe('Liquidity Pool Deposit');
    expect(resolveOperationTypeLabel('liquidity_pool_withdraw').label).toBe('Liquidity Pool Withdraw');
  });
});
