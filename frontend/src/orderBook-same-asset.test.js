import { describe, expect, it } from "vitest";
import { assertTradablePair, orderBookPairKey } from "./orderBook";

const XLM = { isNative: true };
const USDC = {
  isNative: false,
  code: "USDC",
  issuer: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
};

describe("assertTradablePair", () => {
  it("accepts two different assets", () => {
    expect(assertTradablePair(XLM, USDC)).toEqual({
      selling: "native",
      buying: `USDC:${USDC.issuer}`,
    });
  });

  it("refuses a pair of the same native asset", () => {
    expect(() => assertTradablePair(XLM, XLM)).toThrow(
      /two different assets/
    );
  });

  it("refuses the same credit asset written differently", () => {
    expect(() =>
      assertTradablePair(USDC, { ...USDC, code: " usdc " })
    ).toThrow(/two different assets/);
  });

  it("refuses a missing asset descriptor", () => {
    expect(() => assertTradablePair(null, USDC)).toThrow(
      /asset must be an object/
    );
  });

  it("refuses a credit asset with no issuer", () => {
    expect(() =>
      assertTradablePair({ isNative: false, code: "USDC" }, XLM)
    ).toThrow(/needs a code and an issuer/);
  });

  it("builds a stable key for the pair", () => {
    expect(orderBookPairKey(XLM, USDC)).toBe(`native/USDC:${USDC.issuer}`);
  });
});
