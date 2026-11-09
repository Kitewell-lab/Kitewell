import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse.js";

describe("federationAddressParse happy path", () => {
  it("parses a standard name*domain.com address", () => {
    expect(parseFederationAddress("alice*example.com")).toEqual({
      name: "alice",
      domain: "example.com",
    });
  });

  it("preserves name case, normalizes domain to lowercase, and trims outer whitespace", () => {
    expect(parseFederationAddress("  Alice.Builder_42*Sub.Example.ORG  ")).toEqual({
      name: "Alice.Builder_42",
      domain: "sub.example.org",
    });
  });
});
