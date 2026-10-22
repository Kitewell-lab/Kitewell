/**
 * @file operationTypeLabel.js
 * @description Maps raw Horizon operation type strings to human-readable labels and icon IDs for list rendering.
 */

export const DEFAULT_FALLBACK_LABEL = 'Unknown Operation';
export const DEFAULT_FALLBACK_ICON = 'help-circle';

/**
 * Standard mapping from Horizon snake_case operation types to labels and icon IDs.
 */
export const OPERATION_TYPE_MAP = Object.freeze({
  create_account: { label: 'Create Account', iconId: 'user-plus' },
  payment: { label: 'Payment', iconId: 'arrow-right' },
  path_payment_strict_receive: { label: 'Path Payment (Strict Receive)', iconId: 'git-merge' },
  manage_buy_offer: { label: 'Manage Buy Offer', iconId: 'trending-up' },
  manage_sell_offer: { label: 'Manage Sell Offer', iconId: 'trending-down' },
  create_passive_sell_offer: { label: 'Create Passive Sell Offer', iconId: 'clock' },
  set_options: { label: 'Set Options', iconId: 'settings' },
  change_trust: { label: 'Change Trust', iconId: 'link' },
  allow_trust: { label: 'Allow Trust', iconId: 'check-circle' },
  account_merge: { label: 'Account Merge', iconId: 'minimize-2' },
  inflation: { label: 'Inflation', iconId: 'activity' },
  manage_data: { label: 'Manage Data', iconId: 'database' },
  bump_sequence: { label: 'Bump Sequence', iconId: 'fast-forward' },
  path_payment_strict_send: { label: 'Path Payment (Strict Send)', iconId: 'git-commit' },
  create_claimable_balance: { label: 'Create Claimable Balance', iconId: 'lock' },
  claim_claimable_balance: { label: 'Claim Claimable Balance', iconId: 'unlock' },
  begin_sponsoring_future_reserves: { label: 'Begin Sponsoring Reserves', iconId: 'shield' },
  end_sponsoring_future_reserves: { label: 'End Sponsoring Reserves', iconId: 'shield-off' },
  revoke_sponsorship: { label: 'Revoke Sponsorship', iconId: 'slash' },
  clawback: { label: 'Clawback', iconId: 'rotate-ccw' },
  clawback_claimable_balance: { label: 'Clawback Claimable Balance', iconId: 'rotate-ccw' },
  set_trust_line_flags: { label: 'Set Trustline Flags', iconId: 'flag' },
  liquidity_pool_deposit: { label: 'Liquidity Pool Deposit', iconId: 'plus-circle' },
  liquidity_pool_withdraw: { label: 'Liquidity Pool Withdraw', iconId: 'minus-circle' },
  invoke_host_function: { label: 'Invoke Host Function', iconId: 'cpu' },
  extend_footprint_ttl: { label: 'Extend Footprint TTL', iconId: 'calendar' },
  restore_footprint: { label: 'Restore Footprint', iconId: 'refresh-cw' },
});

/**
 * Converts a snake_case string into Title Case words.
 *
 * @param {string} str
 * @returns {string}
 */
function snakeToTitleCase(str) {
  return str
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolves a raw Horizon operation type into a { label, iconId, isKnown } display object.
 *
 * @param {*} rawType - Raw operation type (e.g. "payment", "create_account")
 * @param {Object} [options={}] - Options
 * @param {string} [options.fallbackLabel=DEFAULT_FALLBACK_LABEL]
 * @param {string} [options.fallbackIcon=DEFAULT_FALLBACK_ICON]
 * @param {boolean} [options.autoTitleCase=true] - Whether to generate Title Case for unknown valid strings
 * @returns {{ label: string, iconId: string, isKnown: boolean }}
 */
export function resolveOperationTypeLabel(rawType, options = {}) {
  const {
    fallbackLabel = DEFAULT_FALLBACK_LABEL,
    fallbackIcon = DEFAULT_FALLBACK_ICON,
    autoTitleCase = true,
  } = options;

  if (typeof rawType !== 'string') {
    return {
      label: fallbackLabel,
      iconId: fallbackIcon,
      isKnown: false,
    };
  }

  const normalized = rawType.trim().toLowerCase();
  if (!normalized) {
    return {
      label: fallbackLabel,
      iconId: fallbackIcon,
      isKnown: false,
    };
  }

  if (normalized in OPERATION_TYPE_MAP) {
    const entry = OPERATION_TYPE_MAP[normalized];
    return {
      label: entry.label,
      iconId: entry.iconId,
      isKnown: true,
    };
  }

  // Safe fallback for unlisted operation type
  const generatedLabel = autoTitleCase ? snakeToTitleCase(normalized) : fallbackLabel;

  return {
    label: generatedLabel || fallbackLabel,
    iconId: fallbackIcon,
    isKnown: false,
  };
}

/**
 * Convenience helper returning just the human-readable label.
 *
 * @param {*} rawType
 * @param {Object} [options]
 * @returns {string}
 */
export function getOperationTypeLabel(rawType, options) {
  return resolveOperationTypeLabel(rawType, options).label;
}

/**
 * Convenience helper returning just the icon identifier.
 *
 * @param {*} rawType
 * @param {Object} [options]
 * @returns {string}
 */
export function getOperationTypeIcon(rawType, options) {
  return resolveOperationTypeLabel(rawType, options).iconId;
}

/**
 * Checks whether an operation type is known in the standard mapping.
 *
 * @param {*} rawType
 * @returns {boolean}
 */
export function isKnownOperationType(rawType) {
  if (typeof rawType !== 'string') return false;
  return rawType.trim().toLowerCase() in OPERATION_TYPE_MAP;
}
