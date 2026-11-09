import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";

test("computes exact percentages for large 64-bit and arbitrary-size BigInts", () => {
  const maxInt64 = 9_223_372_036_854_775_807n;
  assert.equal(calculatePoolSharePercentage(maxInt64, maxInt64), "100.0000");

  const hugeTotal = 10n ** 30n;
  const hugeShare = 123_456n * 10n ** 23n; // 1.23456%
  assert.equal(
    calculatePoolSharePercentage(hugeShare, hugeTotal, { precision: 5 }),
    "1.23456",
  );
});

test("accepts safe integer numbers alongside BigInts and decimal strings", () => {
  assert.equal(calculatePoolSharePercentage(1, 8), "12.5000");
  assert.equal(calculatePoolSharePercentage(50n, "200.0000000"), "25.0000");
});
