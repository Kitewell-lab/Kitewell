import { describe, expect, it } from "vitest";
import { tryParseFederationAddress, isFederationAddress } from "./federationAddressParse";

describe("tryParseFederationAddress and isFederationAddress helpers", () => {
  it("returns ok: true and parsed object for valid address", () => {
    const res = tryParseFederationAddress("bob*stellar.org");
    expect(res.ok).toBe(true);
    expect(res.data.name).toBe("bob");
    expect(res.data.domain).toBe("stellar.org");
    expect(isFederationAddress("bob*stellar.org")).toBe(true);
  });

  it("returns ok: false without throwing for invalid address", () => {
    const res = tryParseFederationAddress("bob@stellar.org");
    expect(res.ok).toBe(false);
    expect(res.code).toBe("MISSING_SEPARATOR");
    expect(typeof res.error).toBe("string");
    expect(isFederationAddress("bob@stellar.org")).toBe(false);
  });

  it("returns false for non-string or empty values", () => {
    expect(isFederationAddress(null)).toBe(false);
    expect(isFederationAddress("")).toBe(false);
    expect(isFederationAddress("   ")).toBe(false);
  });
});
