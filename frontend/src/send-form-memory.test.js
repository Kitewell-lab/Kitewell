import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  clearSendFormMemory,
  readStoredSendForm,
  saveSendFormMemory,
  SEND_FORM_MEMORY_STORAGE_KEY,
} = await import("./sendFormMemory");

const DESTINATION = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const ISSUER = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ASSET_KEY = `USDC:${ISSUER}`;

function balances(withAsset = true) {
  const rows = [{ key: "native", code: "XLM", isNative: true, balance: "10" }];
  if (withAsset) rows.push({ key: ASSET_KEY, code: "USDC", issuer: ISSUER, balance: "5" });
  return rows;
}

function stored() {
  return JSON.parse(globalThis.localStorage.getItem(SEND_FORM_MEMORY_STORAGE_KEY) || "null");
}

beforeEach(() => {
  const values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("last send destination and asset", () => {
  it("restores a fixture destination and asset, but not the amount or memo", () => {
    saveSendFormMemory({ destination: DESTINATION, assetKey: ASSET_KEY }, balances());

    expect(readStoredSendForm(balances())).toEqual({
      destination: DESTINATION,
      assetKey: ASSET_KEY,
    });
    expect(stored()).toEqual({ destination: DESTINATION, assetKey: ASSET_KEY });
  });

  it("drops an asset that is not in the balance list", () => {
    saveSendFormMemory({ destination: DESTINATION, assetKey: ASSET_KEY }, balances());

    expect(readStoredSendForm(balances(false))).toEqual({
      destination: DESTINATION,
      assetKey: "",
    });
    expect(stored()).toEqual({ destination: DESTINATION });
  });

  it("starts blank when nothing has been remembered and clears on request", () => {
    expect(readStoredSendForm(balances())).toEqual({
      destination: "",
      assetKey: "native",
    });

    saveSendFormMemory({ destination: DESTINATION, assetKey: "native" }, balances());
    clearSendFormMemory();

    expect(stored()).toBeNull();
    expect(readStoredSendForm(balances()).destination).toBe("");
  });
});
