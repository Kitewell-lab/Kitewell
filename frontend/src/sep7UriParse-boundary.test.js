import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";
import {
  MAX_SEP7_URI_LENGTH,
  SEP7_URI_ERROR,
} from "./sep7UriParseConstants.js";

describe("sep7UriParse URI length boundary", () => {
  it("accepts a URI at the exact 8192-character boundary", () => {
    const prefix = "web+stellar:tx?xdr=";
    const xdr = "A".repeat(MAX_SEP7_URI_LENGTH - prefix.length);
    const uri = `${prefix}${xdr}`;

    expect(uri.length).toBe(MAX_SEP7_URI_LENGTH);
    expect(parseSep7Uri(uri)).toEqual({
      operation: "tx",
      params: { xdr },
    });
  });

  it("rejects a URI 1 character above the 8192-character limit", () => {
    const prefix = "web+stellar:tx?xdr=";
    const overUri = `${prefix}${"A".repeat(MAX_SEP7_URI_LENGTH - prefix.length + 1)}`;

    expect(() => parseSep7Uri(overUri)).toThrow(RangeError);
    expect(() => parseSep7Uri(overUri)).toThrow(SEP7_URI_ERROR.TOO_LONG);
  });
});
