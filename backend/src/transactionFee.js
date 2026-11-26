/**
 * Fee fields for a payment row, read from the Horizon transaction record that
 * `join=transactions` embeds in each payment. Nothing is estimated: a field the
 * record does not carry is null.
 *
 * `fee_charged` is the outer fee for a fee-bump transaction; the inner
 * transaction's own fee is never read, so the two are not added together.
 *
 * @param {object|null|undefined} transaction Horizon transaction record.
 * @returns {{ fee_charged: string|null, operation_count: number|null,
 *   fee_bumped: boolean }}
 */
export function mapTransactionFee(transaction) {
  const record = transaction && typeof transaction === "object" ? transaction : {};
  const whole = (value) => {
    const text = typeof value === "number" ? String(value) : value;
    return typeof text === "string" && /^\d+$/.test(text.trim()) ? text.trim() : null;
  };

  const fee = whole(record.fee_charged);
  const operations = whole(record.operation_count);
  return {
    fee_charged: fee === null ? null : BigInt(fee).toString(),
    operation_count: operations === null ? null : Number(operations),
    fee_bumped: Boolean(record.fee_bump_transaction || record.inner_transaction),
  };
}

/**
 * Outer and inner source of a transaction, read from the same embedded record.
 *
 * `fee_account` paid the fee and `source_account` is the source of the
 * transaction that carries the operations. They differ only for a fee bump,
 * so any other transaction keeps `source_account` and leaves `fee_account`
 * null instead of inventing an outer source. A fee bump whose inner source is
 * missing keeps `source_account` null so the row can say it was not read.
 *
 * @param {object|null|undefined} transaction Horizon transaction record.
 * @returns {{ source_account: string|null, fee_account: string|null }}
 */
export function mapTransactionSources(transaction) {
  const record = transaction && typeof transaction === "object" ? transaction : {};
  const address = (value) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const feeBumped = Boolean(record.fee_bump_transaction || record.inner_transaction);
  const source = address(record.source_account);
  if (!feeBumped) {
    return { source_account: source ?? address(record.fee_account), fee_account: null };
  }
  return { source_account: source, fee_account: address(record.fee_account) };
}
