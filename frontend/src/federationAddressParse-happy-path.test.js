import { describe, expect, it } from "vitest";
import { parseFederationAddress } from "./federationAddressParse";

describe("parseFederationAddress happy path", () => {
  it("parses standard user*domain address", () => {
    const res = parseFederationAddress("jed*stellar.org");
    expect(res.name).toBe("jed");
    expect(res.domain).toBe("stellar.org");
    expect(res.raw).toBe("jed*stellar.org");
  });

  it("parses addresses with complex subdomains and dots", () => {
    const res = parseFederationAddress("alice.smith*payment.staging.stellar.org");
    expect(res.name).toBe("alice.smith");
    expect(res.domain).toBe("payment.staging.stellar.org");
  });

  it("parses addresses with hyphens and numbers", () => {
    const res = parseFederationAddress("user-123*fin-tech42.io");
    expect(res.name).toBe("user-123");
    expect(res.domain).toBe("fin-tech42.io");
  });
});
