/**
 * Read a Horizon order book for one selling/buying pair without placing an
 * offer.
 *
 * The helpers here are pure so the offer form can load a book, show the best
 * bids and asks (up to ten each), and fill the offer price from a chosen row
 * without submitting anything. A pair of the same asset is refused, an empty
 * book is an empty state rather than an error, and a failed load reports a
 * readable message while leaving the form untouched.
 */

/** Deepest level shown on each side of the book. */
export const ORDER_BOOK_LEVELS = 10;

function assetKey(asset) {
  if (!asset || typeof asset !== "object") {
    throw new TypeError("asset must be an object");
  }
  if (asset.isNative) return "native";

  const code = String(asset.code ?? "").trim().toUpperCase();
  const issuer = String(asset.issuer ?? "").trim();
  if (!code || !issuer) {
    throw new Error("A credit asset needs a code and an issuer.");
  }
  return `${code}:${issuer}`;
}

/**
 * A stable `SELLING/BUYING` key for a pair, used to reload the book only when
 * the chosen pair actually changes.
 */
export function orderBookPairKey(selling, buying) {
  return `${assetKey(selling)}/${assetKey(buying)}`;
}

/**
 * Refuse a pair that cannot trade: both sides must be present and different.
 *
 * @returns {{ selling: string, buying: string }} the normalized pair keys
 */
export function assertTradablePair(selling, buying) {
  const sellingKey = assetKey(selling);
  const buyingKey = assetKey(buying);

  if (sellingKey === buyingKey) {
    throw new Error(
      "Choose two different assets: an order book needs a distinct selling and a buying asset."
    );
  }

  return { selling: sellingKey, buying: buyingKey };
}

/**
 * Map Horizon order book levels into display rows, keeping the best ten.
 * Horizon already returns bids high-to-low and asks low-to-high.
 *
 * @param {object[]} levels Horizon levels with `price`, `amount`, `price_r`
 * @param {number} [limit]
 * @returns {{ price: string, amount: string, priceR: object|null }[]}
 */
export function mapOrderBookLevels(levels, limit = ORDER_BOOK_LEVELS) {
  if (!Array.isArray(levels)) {
    throw new TypeError("levels must be an array");
  }

  return levels.slice(0, limit).map((level) => {
    if (!level || typeof level !== "object") {
      throw new TypeError("each level must be an object");
    }

    const price = String(level.price ?? "").trim();
    const amount = String(level.amount ?? "").trim();
    if (!price || !amount) {
      throw new TypeError("each level needs a price and an amount");
    }

    return { price, amount, priceR: level.price_r ?? null };
  });
}

/**
 * Shape one Horizon order book payload for the panel.
 *
 * @param {{ bids?: object[], asks?: object[] }} book
 * @returns {{ bids: object[], asks: object[], isEmpty: boolean }}
 */
export function orderBookView(book) {
  if (!book || typeof book !== "object") {
    throw new TypeError("book must be an object");
  }

  const bids = mapOrderBookLevels(book.bids ?? []);
  const asks = mapOrderBookLevels(book.asks ?? []);

  return { bids, asks, isEmpty: bids.length === 0 && asks.length === 0 };
}

/**
 * The price a chosen row puts in the offer form. It never submits an offer.
 *
 * @param {{ price?: string }} row
 * @returns {string} the price exactly as the book shows it
 */
export function offerPriceFromRow(row) {
  if (!row || typeof row !== "object") {
    throw new TypeError("row must be an object");
  }

  const price = String(row.price ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(price) || !/[1-9]/.test(price)) {
    throw new Error("That order book row has no usable price.");
  }

  return price;
}

/**
 * The price numerator and denominator a chosen row puts in the offer form.
 * Horizon's `price_r` is already the exact fraction, so the offer keeps the
 * book's price instead of a rounded decimal.
 *
 * @param {{ priceR?: { n: number, d: number } }} row
 * @returns {{ numerator: string, denominator: string }}
 */
export function offerPriceFractionFromRow(row) {
  if (!row || typeof row !== "object") {
    throw new TypeError("row must be an object");
  }

  const numerator = Number(row.priceR?.n);
  const denominator = Number(row.priceR?.d);
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    throw new Error("That order book row has no usable price fraction.");
  }

  return { numerator: String(numerator), denominator: String(denominator) };
}

/**
 * Keep the offer form on a failed book load and explain what happened.
 *
 * @param {unknown} error the rejected load
 * @returns {string} a user-facing message
 */
export function orderBookFailureMessage(error) {
  const detail =
    error && typeof error.message === "string" && error.message.trim()
      ? ` ${error.message.trim()}`
      : "";

  return `The order book could not be read.${detail} The offer form was kept — try loading the book again.`;
}
