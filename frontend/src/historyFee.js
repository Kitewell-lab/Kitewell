/**
 * Fee and operation count for a history row, read from the Horizon
 * transaction record that Horizon embeds in a payment (`join=transactions`).
 * Nothing here estimates a fee: a field the record does not carry stays null.
 */

const STROOPS_PER_XLM = 10_000_000n;

/** Parse a non-negative whole-number string or number; anything else is null. */
function parseWhole(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  return null;
}

/**
 * Pick the history fields out of a Horizon transaction record.
 *
 * `fee_charged` is the one figure the network took. For a fee-bump
 * transaction Horizon reports the outer fee there, and the inner transaction
 * keeps its own `max_fee` under `inner_transaction`, which is never read here,
 * so the two are not added together.
 *
 * @param {object|null|undefined} transaction Horizon transaction record.
 * @returns {{ fee_charged: string|null, operation_count: number|null,
 *   fee_bumped: boolean }}
 */
export function mapTransactionFee(transaction) {
  const record = transaction && typeof transaction === "object" ? transaction : {};
  const fee = parseWhole(record.fee_charged);
  const operations = parseWhole(record.operation_count);
  return {
    fee_charged: fee === null ? null : fee.toString(),
    operation_count: operations === null ? null : Number(operations),
    fee_bumped: Boolean(record.fee_bump_transaction || record.inner_transaction),
  };
}

/** A non-blank address string, trimmed; anything else is null. */
function readAddress(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Who paid the fee and who did the work, read from a Horizon transaction record.
 *
 * Horizon puts the fee payer in `fee_account` and the source of the
 * transaction that carries the operations in `source_account`. For a
 * fee-bumped transaction those are the outer and the inner source. For any
 * other transaction they are the same account, so only `source_account` is
 * kept and `fee_account` stays null rather than inventing an outer source.
 *
 * @param {object|null|undefined} transaction Horizon transaction record.
 * @returns {{ source_account: string|null, fee_account: string|null }}
 *   For a fee bump, `fee_account` is the outer source and `source_account`
 *   the inner one (null when the inner transaction could not be read).
 */
export function mapTransactionSources(transaction) {
  const record = transaction && typeof transaction === "object" ? transaction : {};
  const feeBumped = Boolean(record.fee_bump_transaction || record.inner_transaction);
  const source = readAddress(record.source_account);
  if (!feeBumped) {
    return { source_account: source ?? readAddress(record.fee_account), fee_account: null };
  }
  return { source_account: source, fee_account: readAddress(record.fee_account) };
}

/** Format a stroop amount as XLM with up to seven decimals, trailing zeros trimmed. */
function stroopsToXlm(stroops) {
  const whole = stroops / STROOPS_PER_XLM;
  const fraction = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Format the fee and operation count line for a history row.
 *
 * @param {{ fee_charged?: unknown, operation_count?: unknown,
 *   fee_bumped?: unknown }} record A mapped history record.
 * @returns {string} For example `Fee 0.00001 XLM · 1 operation`; a missing fee
 *   reads `Fee unknown`, a missing count `operations unknown`, and a fee-bumped
 *   transaction labels its fee `Outer fee paid` and adds `fee-bumped`.
 */
export function formatHistoryFee(record) {
  const fee = parseWhole(record?.fee_charged);
  const operations = parseWhole(record?.operation_count);

  const bumped = record?.fee_bumped === true;
  // A fee bump's fee_charged is what the outer source paid, so say so.
  const label = bumped ? "Outer fee paid" : "Fee";
  const parts = [fee === null ? `${label} unknown` : `${label} ${stroopsToXlm(fee)} XLM`];
  if (bumped) parts.push("fee-bumped");
  parts.push(
    operations === null
      ? "operations unknown"
      : `${operations} ${operations === 1n ? "operation" : "operations"}`
  );
  return parts.join(" · ");
}
