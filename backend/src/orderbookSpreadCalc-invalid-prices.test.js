import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread, isValidOrderbookPrice, InvalidOrderbookPriceError } from "./orderbookSpreadCalc.js";

test("rejects zero or negative prices", () => {
  assert.equal(isValidOrderbookPrice("0"), false);
  assert.equal(isValidOrderbookPrice("-1.5"), false);

  assert.throws(() => calcOrderbookSpread("0", "1.0"), InvalidOrderbookPriceError);
  assert.throws(() => calcOrderbookSpread("1.0", "-2.0"), InvalidOrderbookPriceError);
});

test("rejects null, undefined, and non-numeric strings", () => {
  assert.equal(isValidOrderbookPrice(null), false);
  assert.equal(isValidOrderbookPrice("abc"), false);

  assert.throws(() => calcOrderbookSpread(null, "1.0"), InvalidOrderbookPriceError);
  assert.throws(() => calcOrderbookSpread("1.0", "xyz"), InvalidOrderbookPriceError);
});
