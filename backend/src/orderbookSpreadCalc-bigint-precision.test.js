import test from "node:test";
import assert from "node:assert/strict";

import { calcOrderbookSpread } from "./orderbookSpreadCalc.js";

test("computes spread for large integers without floating-point rounding errors", () => {
  const bigBid = { n: 1000000000000000n, d: 100000000000000n }; // 10
  const bigAsk = { n: 1100000000000000n, d: 100000000000000n }; // 11

  const res = calcOrderbookSpread(bigBid, bigAsk);
  assert.equal(res.absoluteSpread, "1.0000000");
  assert.equal(res.percentageSpread, "9.0909091%"); // (1 / 11) * 100 = 9.09090909... rounded to 9.0909091
});
