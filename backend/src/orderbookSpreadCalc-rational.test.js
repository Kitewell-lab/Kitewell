import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrderbookSpread } from "./orderbookSpreadCalc.js";

test("preserves exact rational precision on repeating fractions and large BigInt ratios", () => {
  const result = calculateOrderbookSpread({
    bids: [{ price_r: { n: 1n, d: 3n } }],
    asks: [{ price_r: { n: 2n, d: 3n } }],
  });

  assert.equal(result.bidPrice, "0.3333333");
  assert.equal(result.askPrice, "0.6666667");
  assert.equal(result.absolute, "0.3333333");
  assert.equal(result.midPrice, "0.5000000");
  assert.equal(result.percentage, "66.6667");
  assert.deepEqual(result.rational, { n: 1n, d: 3n });
});

test("handles large 64-bit numerator/denominator strings without float loss", () => {
  const denom = "1000000000000000000";
  const result = calculateOrderbookSpread({
    bids: [{ price_r: { n: "1000000000000000000", d: denom } }],
    asks: [{ price_r: { n: "1000000500000000000", d: denom } }],
  });

  assert.equal(result.absolute, "0.0000005");
  assert.deepEqual(result.rational, { n: 1n, d: 2_000_000n });
});
