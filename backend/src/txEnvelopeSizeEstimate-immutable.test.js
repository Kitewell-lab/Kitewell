import test from "node:test";
import assert from "node:assert/strict";

import {
  MEMO_TYPE_BYTES,
  SUPPORTED_MEMO_TYPES,
  TX_ENVELOPE_SIZE_ERROR,
} from "./txEnvelopeSizeEstimateConstants.js";

test("exported constant objects and arrays are frozen", () => {
  assert.equal(Object.isFrozen(MEMO_TYPE_BYTES), true);
  assert.equal(Object.isFrozen(SUPPORTED_MEMO_TYPES), true);
  assert.equal(Object.isFrozen(TX_ENVELOPE_SIZE_ERROR), true);
});
