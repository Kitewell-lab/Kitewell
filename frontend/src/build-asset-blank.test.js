import { describe, it, expect } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import { buildAsset } from "./stellar.js";

const VALID_ISSUER =
  "GBQNCSSNKIXG77WHAYYPYV4JG7CB4SNLMZ26WV63MNJPNN3IP72LTZTA";

describe("buildAsset — blank credit-asset code", () => {
  it("throws for whitespace-only code", () => {
    expect(() => buildAsset({ isNative: false, code: " ", issuer: VALID_ISSUER })).toThrow(
      "Asset code is required for a credit asset."
    );
  });
});