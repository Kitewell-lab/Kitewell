/**
 * @file operationTypeLabel.js
 * @description Maps Horizon operation type strings to human-readable labels and icon IDs for UI rendering.
 */

/**
 * Standard registry mapping Horizon operation types to label and icon identifiers.
 */
export const OPERATION_TYPE_REGISTRY = Object.freeze({
  create_account: Object.freeze({ label: 'Create Account', iconId: 'user-plus' }),
  payment: Object.freeze({ label: 'Payment', iconId: 'send' }),
  path_payment_strict_receive: Object.freeze({ label: 'Path Payment (Strict Receive)', iconId: 'shuffle' }),
  path_payment_strict_send: Object.freeze({ label: 'Path Payment (Strict Send)', iconId: 'shuffle' }),
  path_payment: Object.freeze({ label: 'Path Payment', iconId: 'shuffle' }),
  manage_sell_offer: Object.freeze({ label: 'Manage Sell Offer', iconId: 'tag' }),
  create_passive_sell_offer: Object.freeze({ label: 'Create Passive Sell Offer', iconId: 'tag' }),
  set_options: Object.freeze({ label: 'Set Options', iconId: 'settings' }),
  change_trust: Object.freeze({ label: 'Change Trust', iconId: 'shield-check' }),
  allow_trust: Object.freeze({ label: 'Allow Trust', iconId: 'check-circle' }),
  account_merge: Object.freeze({ label: 'Account Merge', iconId: 'git-merge' }),
  inflation: Object.freeze({ label: 'Inflation', iconId: 'trending-up' }),
  manage_data: Object.freeze({ label: 'Manage Data', iconId: 'database' }),
  bump_sequence: Object.freeze({ label: 'Bump Sequence', iconId: 'fast-forward' }),
  manage_buy_offer: Object.freeze({ label: 'Manage Buy Offer', iconId: 'shopping-cart' }),
  create_claimable_balance: Object.freeze({ label: 'Create Claimable Balance', iconId: 'clock' }),
  claim_claimable_balance: Object.freeze({ label: 'Claim Claimable Balance', iconId: 'inbox' }),
  begin_sponsoring_future_reserves: Object.freeze({ label: 'Begin Sponsoring', iconId: 'heart' }),
  end_sponsoring_future_reserves: Object.freeze({ label: 'End Sponsoring', iconId: 'heart-off' }),
  revoke_sponsorship: Object.freeze({ label: 'Revoke Sponsorship', iconId: 'x-circle' }),
  clawback: Object.freeze({ label: 'Clawback', iconId: 'rotate-ccw' }),
  clawback_claimable_balance: Object.freeze({ label: 'Clawback Claimable Balance', iconId: 'rotate-ccw' }),
  set_trust_line_flags: Object.freeze({ label: 'Set Trustline Flags', iconId: 'flag' }),
  liquidity_pool_deposit: Object.freeze({ label: 'Liquidity Pool Deposit', iconId: 'droplet' }),
  liquidity_pool_withdraw: Object.freeze({ label: 'Liquidity Pool Withdraw', iconId: 'droplet-off' }),
  invoke_host_function: Object.freeze({ label: 'Invoke Contract', iconId: 'cpu' })
});

/**
 * Fallback representation for unknown or missing operation types.
 */
export const DEFAULT_UNKNOWN_OPERATION = Object.freeze({
  label: 'Unknown Operation',
  iconId: 'help-circle'
});

/**
 * Extracts and normalizes the operation type key from a string or object.
 *
 * @param {*} typeOrOp
 * @returns {string|null}
 */
function extractTypeKey(typeOrOp) {
  if (typeOrOp === null || typeOrOp === undefined) {
    return null;
  }
  if (typeof typeOrOp === 'string') {
    return typeOrOp.trim().toLowerCase();
  }
  if (typeof typeOrOp === 'object' && typeof typeOrOp.type === 'string') {
    return typeOrOp.type.trim().toLowerCase();
  }
  return null;
}

/**
 * Resolves a Horizon operation type into a { label, iconId } metadata object.
 *
 * @param {string|Object} typeOrOp - Horizon operation type string or operation object
 * @param {Object} [options={}] - Options
 * @param {Object} [options.fallback=DEFAULT_UNKNOWN_OPERATION] - Custom fallback object
 * @returns {{ label: string, iconId: string }}
 */
export function resolveOperationTypeLabel(typeOrOp, options = {}) {
  const { fallback = DEFAULT_UNKNOWN_OPERATION } = options;
  const key = extractTypeKey(typeOrOp);

  if (!key || !(key in OPERATION_TYPE_REGISTRY)) {
    return fallback;
  }

  return OPERATION_TYPE_REGISTRY[key];
}

/**
 * Gets only the label string for an operation.
 *
 * @param {string|Object} typeOrOp - Horizon operation type or object
 * @param {Object} [options={}] - Options
 * @returns {string}
 */
export function getOperationLabel(typeOrOp, options = {}) {
  const resolved = resolveOperationTypeLabel(typeOrOp, options);
  return resolved.label;
}

/**
 * Gets only the iconId string for an operation.
 *
 * @param {string|Object} typeOrOp - Horizon operation type or object
 * @param {Object} [options={}] - Options
 * @returns {string}
 */
export function getOperationIconId(typeOrOp, options = {}) {
  const resolved = resolveOperationTypeLabel(typeOrOp, options);
  return resolved.iconId;
}

/**
 * Checks whether an operation type is known in the registry.
 *
 * @param {*} type - Operation type string
 * @returns {boolean} True if recognized
 */
export function isKnownOperationType(type) {
  const key = extractTypeKey(type);
  return Boolean(key && key in OPERATION_TYPE_REGISTRY);
}
