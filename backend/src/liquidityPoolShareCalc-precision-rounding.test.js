import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";

test("supports custom precision from 0 through 18 decimal places", () => {
  assert.equal(calculatePoolSharePercentage(1n, 4n, { precision: 0 }), "25");
  assert.equal(calculatePoolSharePercentage(1n, 4n, { precision: 2 }), "25.00");
  assert.equal(
    calculatePoolSharePercentage(1n, 8n, { precision: 8 }),
    "12.50000000",
  );
});

test("distinguishes half-up and down rounding modes on repeating fractions", () => {
  assert.equal(
    calculatePoolSharePercentage(2n, 3n, { precision: 4, rounding: "half-up" }),
    "66.6667",
  );
  assert.equal(
    calculatePoolSharePercentage(2n, 3n, { precision: 4, rounding: "down" }),
    "66.6666",
  );
  assert.equal(
    calculatePoolSharePercentage(1n, 200n, {
      precision: 0,
      rounding: "half-up",
    }),
    "1",
  );
  assert.equal(
    calculatePoolSharePercentage(1n, 200n, { precision: 0, rounding: "down" }),
    "0",
  );
});
