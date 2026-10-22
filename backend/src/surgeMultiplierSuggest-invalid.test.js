import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("throws TypeError when feeStats is null, undefined, or non-object", () => {
  assert.throws(() => suggestSurgeMultiplier(null), TypeError);
  assert.throws(() => suggestSurgeMultiplier(undefined), TypeError);
  assert.throws(() => suggestSurgeMultiplier("stats"), TypeError);
  assert.throws(() => suggestSurgeMultiplier([1, 2, 3]), TypeError);
});

test("throws RangeError on unsupported priority option", () => {
  assert.throws(
    () => suggestSurgeMultiplier({}, { priority: "fastest" }),
    RangeError,
  );
  assert.throws(
    () => suggestSurgeMultiplier({}, { priority: "turbo" }),
    RangeError,
  );
});

test("throws RangeError when minMultiplier exceeds maxMultiplier", () => {
  assert.throws(
    () =>
      suggestSurgeMultiplier({}, { minMultiplier: 2.5, maxMultiplier: 1.5 }),
    RangeError,
  );
});
