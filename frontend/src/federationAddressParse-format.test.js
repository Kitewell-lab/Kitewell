import { describe, expect, it } from "vitest";
import {
  formatFederationAddress,
  parseFederationAddress,
} from "./federationAddressParse.js";

describe("federationAddressParse formatFederationAddress", () => {
  it("formats a validated name and domain and round-trips cleanly", () => {
    const formatted = formatFederationAddress("  alice ", " Example.COM ");
    expect(formatted).toBe("alice*example.com");
    expect(parseFederationAddress(formatted)).toEqual({
      name: "alice",
      domain: "example.com",
    });
  });

  it("rejects non-string or invalid parts when formatting", () => {
    expect(() => formatFederationAddress(null, "example.com")).toThrow(TypeError);
    expect(() => formatFederationAddress("a*b", "example.com")).toThrow();
    expect(() => formatFederationAddress("alice", "bad_domain")).toThrow();
  });
});
