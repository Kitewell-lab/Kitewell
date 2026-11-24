import { describe, expect, it, vi } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import { checkPathPaymentDestination, destinationTrustlineStatus, validateStrictReceiveCap } from "./pathPaymentGuards";

const DESTINATION = StellarSdk.Keypair.random().publicKey();
const ISSUER = StellarSdk.Keypair.random().publicKey();
const USDC = { isNative: false, code: "USDC", issuer: ISSUER };

const holding = (code, issuer) => ({
  balances: [
    { asset_type: "native", balance: "10.0000000" },
    { asset_type: "credit_alphanum4", asset_code: code, asset_issuer: issuer, balance: "0" },
  ],
});

describe("checkPathPaymentDestination", () => {
  it("blocks a destination with no trustline for the destination asset", async () => {
    const loadAccount = vi.fn().mockResolvedValue({
      balances: [{ asset_type: "native", balance: "10.0000000" }],
    });
    const result = await checkPathPaymentDestination(DESTINATION, USDC, loadAccount);
    expect(result).toMatchObject({ ok: false, status: "no_trustline" });
    expect(result.message).toMatch(/no trustline for USDC/);
    expect(loadAccount).toHaveBeenCalledWith(DESTINATION);
  });

  it("allows a destination that holds the destination asset", async () => {
    const loadAccount = vi.fn().mockResolvedValue(holding("USDC", ISSUER));
    await expect(checkPathPaymentDestination(DESTINATION, USDC, loadAccount)).resolves.toEqual({
      ok: true,
      status: "ok",
    });
  });

  it("checks the destination asset, not the asset being sent", async () => {
    const loadAccount = vi.fn().mockResolvedValue(holding("EURC", ISSUER));
    expect((await checkPathPaymentDestination(DESTINATION, USDC, loadAccount)).ok).toBe(false);
  });

  it("does not treat the same code from another issuer as a trustline", async () => {
    const other = StellarSdk.Keypair.random().publicKey();
    const loadAccount = vi.fn().mockResolvedValue(holding("USDC", other));
    expect((await checkPathPaymentDestination(DESTINATION, USDC, loadAccount)).ok).toBe(false);
  });

  it("skips the check for XLM as the destination asset", async () => {
    const loadAccount = vi.fn();
    await expect(
      checkPathPaymentDestination(DESTINATION, { isNative: true }, loadAccount)
    ).resolves.toEqual({ ok: true, status: "native" });
    expect(loadAccount).not.toHaveBeenCalled();
  });

  it("reports a destination Horizon does not know as unknown and blocks", async () => {
    const loadAccount = vi.fn().mockRejectedValue({ response: { status: 404 } });
    const result = await checkPathPaymentDestination(DESTINATION, USDC, loadAccount);
    expect(result).toMatchObject({ ok: false, status: "unknown" });
    expect(result.message).toMatch(/unknown to Horizon/);
  });

  it("surfaces other Horizon failures instead of guessing", async () => {
    const loadAccount = vi.fn().mockRejectedValue(new Error("Horizon is down"));
    await expect(checkPathPaymentDestination(DESTINATION, USDC, loadAccount)).rejects.toThrow(
      "Horizon is down"
    );
  });

  it("destinationTrustlineStatus reads balances only", () => {
    expect(destinationTrustlineStatus({}, USDC)).toBe("no_trustline");
    expect(destinationTrustlineStatus({}, { isNative: true })).toBe("native");
  });
});

describe("validateStrictReceiveCap", () => {
  const quotes = [{ sourceAmount: "10.0000000" }];

  it("refuses a cap one stroop under the quote", () => {
    const result = validateStrictReceiveCap({ mode: "strictReceive", sendMax: "9.9999999", quotes });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/below the quote/);
  });

  it("allows a cap equal to the quote and one above it", () => {
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "10", quotes })).toEqual({ ok: true });
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "10.0000001", quotes })).toEqual({ ok: true });
  });

  it("compares against the best quote when several paths are on screen", () => {
    const many = [{ sourceAmount: "12" }, { sourceAmount: "10.5" }];
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "10.4999999", quotes: many }).ok).toBe(false);
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "10.5", quotes: many }).ok).toBe(true);
  });

  it("does not warn when there is no quote on screen", () => {
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "1", quotes: [] })).toEqual({ ok: true });
    expect(validateStrictReceiveCap({ mode: "strictReceive", sendMax: "1" })).toEqual({ ok: true });
  });

  it("never compares strict send against the maximum", () => {
    expect(validateStrictReceiveCap({ mode: "strictSend", sendMax: "1", quotes })).toEqual({ ok: true });
  });
});
