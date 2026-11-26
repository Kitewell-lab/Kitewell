import { useState } from "react";
import { shortenAddress } from "./addressShorten";
import { copyToClipboardResult } from "./copyToClipboardResult";

/** One labelled address with a button that copies the full address. */
function SourceAddress({ label, address }) {
  const [status, setStatus] = useState("");

  const handleCopy = async (event) => {
    // The history row is itself clickable; copying must not select it.
    event.stopPropagation();
    const result = await copyToClipboardResult(address);
    setStatus(result.ok ? "Copied" : "Copy failed");
  };

  return (
    <span className="tx-item__source">
      {label} <code title={address}>{shortenAddress(address)}</code>{" "}
      <button
        className="tx-item__copy"
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label.toLowerCase()} ${address}`}
      >
        Copy
      </button>
      {status && <span aria-live="polite"> {status}</span>}
    </span>
  );
}

/**
 * The source account(s) of a history row's transaction.
 *
 * A fee-bumped transaction names the outer source, which paid the fee, and
 * the inner source, which did the work. Any other transaction names its one
 * source and no outer one. Each address can be copied.
 *
 * @param {{ tx: { fee_bumped?: boolean, fee_account?: string|null,
 *   source_account?: string|null } }} props A mapped history record.
 */
export function TransactionSources({ tx }) {
  if (tx?.fee_bumped === true) {
    return (
      <div className="tx-item__addr muted tx-item__sources">
        {tx.fee_account ? (
          <SourceAddress label="Outer source (paid the fee)" address={tx.fee_account} />
        ) : (
          <span>Outer source unknown</span>
        )}
        {tx.source_account ? (
          <SourceAddress label="Inner source" address={tx.source_account} />
        ) : (
          <span>The inner transaction could not be read.</span>
        )}
      </div>
    );
  }

  if (!tx?.source_account) return null;
  return (
    <div className="tx-item__addr muted tx-item__sources">
      <SourceAddress label="Source" address={tx.source_account} />
    </div>
  );
}
