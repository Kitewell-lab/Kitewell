import test from "node:test";
import assert from "node:assert/strict";

import defaultClamp, {
  assetAmountClamp,
  clampAssetAmount,
} from "./assetAmountClamp.js";

test("default export and named alias are identical to clampAssetAmount", () => {
  assert.equal(defaultClamp, clampAssetAmount);
  assert.equal(assetAmountClamp, clampAssetAmount);
});
