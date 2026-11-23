/**
 * A credit balance is safe to send only when Horizon explicitly authorizes it.
 * Missing authorization data is unknown, not authorized.
 */
export function isCreditAssetSendable(balance) {
  return balance?.isNative === true || balance?.isAuthorized === true;
}

export function trustlineAuthorizationLabel(balance) {
  if (balance.isAuthorized === false) return "Unauthorized — cannot send";
  if (balance.isAuthorized !== true) return "Authorization unknown — cannot send";
  return "Authorized to send";
}

export function flagLabel(value, enabled, disabled) {
  return value === null || value === undefined
    ? "unknown"
    : value
      ? enabled
      : disabled;
}
