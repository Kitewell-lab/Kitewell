import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";
import { SEP7_URI_ERROR } from "./sep7UriParseConstants.js";

describe("sep7UriParse invalid input types and empty strings", () => {
  it("throws TypeError on non-string inputs", () => {
    for (const invalid of [null, undefined, 123, true, {}, ["web+stellar:pay"]]) {
      expect(() => parseSep7Uri(invalid)).toThrow(TypeError);
      expect(() => parseSep7Uri(invalid)).toThrow(SEP7_URI_ERROR.TYPE);
    }
  });

  it("throws Error on empty or whitespace-only strings", () => {
    for (const empty of ["", "   ", "\t\n"]) {
      expect(() => parseSep7Uri(empty)).toThrow(SEP7_URI_ERROR.EMPTY);
    }
  });
});
