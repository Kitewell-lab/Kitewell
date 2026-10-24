import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_NATIVE_ASSET,
  ASSET_PAIR_SEPARATOR,
  ASSET_PAIR_KEY_ERROR,
} from "./assetPairKeyBuilderConstants.js";

test("CANONICAL_NATIVE_ASSET is 'native'", () => {
  assert.equal(CANONICAL_NATIVE_ASSET, "native");
});

test("ASSET_PAIR_SEPARATOR is '/'", () => {
  assert.equal(ASSET_PAIR_SEPARATOR, "/");
});

test("ASSET_PAIR_KEY_ERROR defines frozen error fragments", () => {
  assert.equal(ASSET_PAIR_KEY_ERROR.REQUIRED, "is required");
  assert.equal(ASSET_PAIR_KEY_ERROR.EMPTY, "cannot be empty");
  assert.equal(Object.isFrozen(ASSET_PAIR_KEY_ERROR), true);
});
