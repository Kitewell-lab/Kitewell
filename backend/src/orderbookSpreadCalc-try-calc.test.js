import test from "node:test";
import assert from "node:assert/strict";

import { tryCalcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("returns result on valid inputs", () => {
  const res = tryCalcOrderbookSpread("1.0", "1.1");
  assert.equal(res.absoluteSpread, "0.1000000");
});

test("returns null fallback on invalid inputs without throwing", () => {
  assert.equal(tryCalcOrderbookSpread("0", "1.0"), null);
  assert.equal(tryCalcOrderbookSpread(null, "1.0"), null);
});

test("returns custom fallback when specified", () => {
  assert.equal(tryCalcOrderbookSpread("-1", "1", {}, "FALLBACK"), "FALLBACK");
});
