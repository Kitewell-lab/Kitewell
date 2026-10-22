import test from "node:test";
import assert from "node:assert/strict";

import defaultSuggest, {
  surgeMultiplierSuggest,
  suggestSurgeMultiplier,
} from "./surgeMultiplierSuggest.js";

test("default export and named alias are identical to suggestSurgeMultiplier", () => {
  assert.equal(defaultSuggest, suggestSurgeMultiplier);
  assert.equal(surgeMultiplierSuggest, suggestSurgeMultiplier);
});
