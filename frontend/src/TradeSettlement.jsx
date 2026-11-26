import { tradeExplorerLink } from "./stellar";

/**
 * The ledger a trade closed in and a link to the transaction that settled it
 * on the selected network's explorer. A trade without a known hash says so.
 * The link only opens the explorer in a new tab; nothing is submitted.
 */
export function TradeSettlement({ trade, network }) {
  const href = tradeExplorerLink(trade, network);
  const ledger = trade?.ledger;

  return (
    <div className="tx-item__addr muted">
      <span>{ledger ? `Ledger ${ledger}` : "Ledger unknown"}</span>
      {" · "}
      {href ? (
        <a
          className="tx-item__hash"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={trade.transaction_hash}
        >
          Transaction {trade.transaction_hash.slice(0, 8)}…
        </a>
      ) : (
        <span>Transaction unknown</span>
      )}
    </div>
  );
}
