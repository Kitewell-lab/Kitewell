import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";
import { SEP7_URI_ERROR } from "./sep7UriParseConstants.js";

describe("sep7UriParse scheme validation", () => {
  it("rejects URIs that do not start with web+stellar:", () => {
    for (const invalid of [
      "stellar:pay?amount=10",
      "https://stellar.org/pay?amount=10",
      "web-stellar:pay?amount=10",
      "pay?amount=10",
    ]) {
      expect(() => parseSep7Uri(invalid)).toThrow(
        SEP7_URI_ERROR.INVALID_SCHEME
      );
    }
  });
});
