/**
 * Constants and error strings for Horizon order book bid-ask spread
 * calculation using BigInt-safe rational arithmetic.
 */

/** Default decimal places for formatted prices and absolute spread (Stellar 7 decimals). */
export const DEFAULT_PRICE_PRECISION = 7;

/** Default decimal places for the formatted percentage spread. */
export const DEFAULT_PERCENTAGE_PRECISION = 4;

/** Minimum allowed decimal precision for formatted strings. */
export const MIN_SPREAD_PRECISION = 0;

/** Maximum allowed decimal precision for formatted strings. */
export const MAX_SPREAD_PRECISION = 18;

/** Default reference price used as the denominator for percentage spread. */
export const DEFAULT_SPREAD_REFERENCE = "mid";

/** Supported reference denominators for percentage spread calculation. */
export const SUPPORTED_SPREAD_REFERENCES = Object.freeze(["mid", "ask", "bid"]);

/** Stable error messages thrown or returned by `orderbookSpreadCalc`. */
export const ORDERBOOK_SPREAD_ERROR = Object.freeze({
  ORDERBOOK_TYPE:
    "Order book must be a plain object containing bids and asks arrays",
  EMPTY_BIDS: "Order book must contain at least one bid",
  EMPTY_ASKS: "Order book must contain at least one ask",
  INVALID_PRICE:
    "Order book entry must contain a valid positive price_r { n, d } or decimal price string",
  ZERO_DENOMINATOR: "Price ratio denominator must be greater than zero",
  NON_POSITIVE_PRICE: "Order book price must be greater than zero",
  CROSSED_BOOK:
    "Order book is crossed: top ask price cannot be less than top bid price",
  OPTIONS_TYPE: "Options must be a plain object",
  PRECISION_RANGE: "Precision must be an integer between 0 and 18",
  INVALID_REFERENCE: 'Spread reference must be one of: "mid", "ask", "bid"',
});
