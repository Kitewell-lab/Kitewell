import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";

test("computes percentage from 7-decimal Horizon share strings", () => {
  assert.equal(
    calculatePoolSharePercentage("250.0000000", "1000.0000000"),
    "25.0000",
  );
  assert.equal(
    calculatePoolSharePercentage("12.5000000", "50.0000000"),
    "25.0000",
  );
});

test("trims surrounding whitespace on decimal share strings", () => {
  assert.equal(
    calculatePoolSharePercentage("  1.25 ", " 10.0000000 "),
    "12.5000",
  );
});
