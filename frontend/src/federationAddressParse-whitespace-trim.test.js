import { describe, expect, it } from "vitest";
import { parseFederationAddress, FederationAddressParseError } from "./federationAddressParse";

describe("parseFederationAddress whitespace and trim handling", () => {
  it("trims surrounding whitespace by default", () => {
    const res = parseFederationAddress("  alice*stellar.org   \n");
    expect(res.name).toBe("alice");
    expect(res.domain).toBe("stellar.org");
    expect(res.raw).toBe("alice*stellar.org");
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(() => parseFederationAddress("")).toThrow(FederationAddressParseError);
    expect(() => parseFederationAddress("   \t  ")).toThrow(FederationAddressParseError);
  });

  it("respects { trim: false } option", () => {
    const res = parseFederationAddress(" alice*domain.com", { trim: false });
    expect(res.name).toBe(" alice");
    expect(res.domain).toBe("domain.com");
  });
});
