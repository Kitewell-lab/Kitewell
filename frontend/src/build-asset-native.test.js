import { describe, it, expect } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import { buildAsset } from "./stellar.js";

describe("buildAsset — native descriptor ignores credit fields", () => {
  it("returns native asset without validating code or issuer", () => {
    const asset = buildAsset({ isNative: true, code: "", issuer: "not-a-key" });
    expect(asset.isNative()).toBe(true);
  });
});