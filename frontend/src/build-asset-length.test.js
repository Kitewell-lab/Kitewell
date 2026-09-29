import { describe, it, expect } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";

export const MAX_ASSET_CODE_LENGTH = 12;

export function buildAsset(code, issuer) {
  if (!code || code.length < 1 || code.length > MAX_ASSET_CODE_LENGTH) {
    throw new Error(
      `Asset code must be 1–${MAX_ASSET_CODE_LENGTH} characters.`
    );
  }
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error("Issuer must be a valid Stellar public key (G…).");
  }
  return new StellarSdk.Asset(code.toUpperCase(), issuer);
}

const VALID_ISSUER =
  "GBQNCSSNKIXG77WHAYYPYV4JG7CB4SNLMZ26WV63MNJPNN3IP72LTZTA";

describe("buildAsset — credit-asset code length", () => {
  it("MAX_ASSET_CODE_LENGTH is 12", () => {
    expect(MAX_ASSET_CODE_LENGTH).toBe(12);
  });

  it("rejects a code longer than 12 characters", () => {
    expect(() => buildAsset("TOOLONGCODE123", VALID_ISSUER)).toThrow(
      "Asset code must be 1–12 characters."
    );
  });

  it("accepts a 12-character code and returns correct getCode()", () => {
    const code = "ABCDEFGHIJKL";
    expect(code.length).toBe(12);

    const asset = buildAsset(code, VALID_ISSUER);
    expect(asset.getCode()).toBe("ABCDEFGHIJKL");
    expect(asset.getIssuer()).toBe(VALID_ISSUER);
  });

  it("upper-cases the code", () => {
    const asset = buildAsset("abcdefghijkl", VALID_ISSUER);
    expect(asset.getCode()).toBe("ABCDEFGHIJKL");
  });

  it("rejects an invalid issuer", () => {
    expect(() => buildAsset("USDC", "NOT_A_KEY")).toThrow(
      "Issuer must be a valid Stellar public key"
    );
  });
});
