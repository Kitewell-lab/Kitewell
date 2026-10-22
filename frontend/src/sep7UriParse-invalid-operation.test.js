import { describe, expect, it } from "vitest";
import { parseSep7Uri, Sep7ParseError } from "./sep7UriParse";

describe("parseSep7Uri invalid operations", () => {
  it("rejects URI missing operation after scheme", () => {
    expect(() => parseSep7Uri("web+stellar:")).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri("web+stellar:?destination=G123")).toThrow(Sep7ParseError);
  });

  it("rejects unsupported operations like swap or claim", () => {
    expect(() => parseSep7Uri("web+stellar:swap?from=XLM&to=USDC")).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri("web+stellar:claim?balanceId=123")).toThrow(Sep7ParseError);
  });

  it("attaches UNSUPPORTED_OPERATION error code for unknown operation", () => {
    try {
      parseSep7Uri("web+stellar:mint?amount=100");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7ParseError);
      expect(err.code).toBe("UNSUPPORTED_OPERATION");
    }
  });
});
