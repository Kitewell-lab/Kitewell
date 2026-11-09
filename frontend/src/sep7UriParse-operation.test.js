import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";
import { SEP7_URI_ERROR } from "./sep7UriParseConstants.js";

describe("sep7UriParse operation validation", () => {
  it("rejects missing operations or double-slash authority prefixes", () => {
    for (const missingOp of [
      "web+stellar:",
      "web+stellar:?amount=10",
      "web+stellar://pay?amount=10",
    ]) {
      expect(() => parseSep7Uri(missingOp)).toThrow(
        SEP7_URI_ERROR.MISSING_OPERATION
      );
    }
  });

  it("rejects unsupported SEP-7 operation names", () => {
    for (const badOp of [
      "web+stellar:sign?xdr=AAAA",
      "web+stellar:swap?amount=10",
      "web+stellar:payment?amount=10",
    ]) {
      expect(() => parseSep7Uri(badOp)).toThrow(
        SEP7_URI_ERROR.UNSUPPORTED_OPERATION
      );
    }
  });
});
