import { describe, expect, it } from "vitest";
import { tryParseSep7Uri, isSep7Uri } from "./sep7UriParse";

describe("tryParseSep7Uri and isSep7Uri helper functions", () => {
  it("returns ok: true and parsed data on valid URI", () => {
    const uri = "web+stellar:pay?destination=GABC&amount=50";
    const res = tryParseSep7Uri(uri);

    expect(res.ok).toBe(true);
    expect(res.data.operation).toBe("pay");
    expect(res.data.params.amount).toBe("50");
    expect(isSep7Uri(uri)).toBe(true);
  });

  it("returns ok: false without throwing on invalid URI", () => {
    const invalidUri = "not-a-stellar-uri";
    const res = tryParseSep7Uri(invalidUri);

    expect(res.ok).toBe(false);
    expect(res.code).toBe("INVALID_SCHEME");
    expect(typeof res.error).toBe("string");
    expect(isSep7Uri(invalidUri)).toBe(false);
  });

  it("returns ok: false on null or empty string", () => {
    expect(isSep7Uri(null)).toBe(false);
    expect(isSep7Uri("")).toBe(false);

    const emptyRes = tryParseSep7Uri("");
    expect(emptyRes.ok).toBe(false);
    expect(emptyRes.code).toBe("EMPTY_URI");
  });
});
