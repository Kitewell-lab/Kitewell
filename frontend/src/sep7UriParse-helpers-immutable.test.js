import { describe, expect, it } from "vitest";
import { isValidSep7Uri, tryParseSep7Uri } from "./sep7UriParse.js";
import {
  SEP7_OPERATIONS,
  SEP7_URI_ERROR,
} from "./sep7UriParseConstants.js";

describe("sep7UriParse tryParseSep7Uri, isValidSep7Uri, and frozen constants", () => {
  it("tryParseSep7Uri returns structured result without throwing", () => {
    expect(tryParseSep7Uri("web+stellar:pay?amount=5")).toEqual({
      ok: true,
      operation: "pay",
      params: { amount: "5" },
    });

    expect(tryParseSep7Uri("invalid")).toEqual({
      ok: false,
      error: SEP7_URI_ERROR.INVALID_SCHEME,
    });
  });

  it("isValidSep7Uri returns boolean and constants are frozen", () => {
    expect(isValidSep7Uri("web+stellar:tx?xdr=AAAA")).toBe(true);
    expect(isValidSep7Uri("web+stellar:unknown")).toBe(false);
    expect(isValidSep7Uri(null)).toBe(false);
    expect(Object.isFrozen(SEP7_OPERATIONS)).toBe(true);
    expect(Object.isFrozen(SEP7_URI_ERROR)).toBe(true);
  });
});
