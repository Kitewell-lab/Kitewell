import { describeOfferFill } from "./stellar";

/**
 * How much of one of the account's open offers is still open, read from the
 * offer itself (its open amount plus its own fills), never from the book.
 */
export function OfferFillSummary({ offer, assetLabel }) {
  const fill = describeOfferFill(offer);
  const unit = assetLabel ? ` ${assetLabel}` : "";

  if (fill.state === "unknown") {
    return (
      <p className="muted" data-fill="unknown">
        Open amount unknown. This offer cannot be cancelled from here.
      </p>
    );
  }

  if (fill.state === "original-unknown") {
    return (
      <p className="muted" data-fill="original-unknown">
        {fill.remaining}
        {unit} still open · original amount unknown
      </p>
    );
  }

  if (fill.state === "open") {
    return (
      <p className="muted" data-fill="open">
        Fully open · {fill.remaining} of {fill.original}
        {unit}
      </p>
    );
  }

  return (
    <p className="muted" data-fill="partial">
      {fill.remaining} of {fill.original}
      {unit} still open · {fill.filled}
      {unit} filled
    </p>
  );
}
