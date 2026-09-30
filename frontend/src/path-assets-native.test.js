import { describe, it, expect } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import { parsePathAssets } from "./stellar.js";

describe("parsePathAssets — native path hop", () => {
  it("parses native to one native hop", () => {
    const assets = parsePathAssets("native");
    expect(assets).toHaveLength(1);
    expect(assets[0].isNative()).toBe(true);
  });

  it("parses NATIVE to one native hop", () => {
    const assets = parsePathAssets("NATIVE");
    expect(assets).toHaveLength(1);
    expect(assets[0].isNative()).toBe(true);
  });
});