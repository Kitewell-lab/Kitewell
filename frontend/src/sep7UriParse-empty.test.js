import { describe, expect, it } from "vitest";
import { parseSep7Uri, Sep7ParseError } from "./sep7UriParse";

describe("parseSep7Uri empty strings", () => {
  it("rejects empty string", () => {
    expect(() => parseSep7Uri("")).toThrow(Sep7ParseError);
  });

  it("rejects whitespace-only string", () => {
    expect(() => parseSep7Uri("   \t\n  ")).toThrow(Sep7ParseError);
  });

  it("attaches EMPTY_URI error code", () => {
    try {
      parseSep7Uri("   ");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7ParseError);
      expect(err.code).toBe("EMPTY_URI");
    }
  });
});
