import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHorizonRoot, looksLikeHorizonRoot } from "./api";
import {
  CUSTOM_NETWORK_STORAGE_KEY,
  getAvailableNetworks,
  getNetworkById,
  removeCustomNetwork,
  saveVerifiedCustomNetwork,
  setActiveNetwork,
} from "./network";

/** A trimmed Horizon root (`GET /`) as a real Horizon serves it. */
const HORIZON_ROOT = {
  _links: {
    account: { href: "https://horizon.example/accounts/{account_id}", templated: true },
    ledgers: { href: "https://horizon.example/ledgers{?cursor,limit,order}", templated: true },
    self: { href: "https://horizon.example/" },
  },
  horizon_version: "23.0.0-abc",
  core_version: "stellar-core 23.0.0",
  ingest_latest_ledger: 123456,
  history_latest_ledger: 123456,
  history_latest_ledger_closed_at: "2026-11-25T00:00:00Z",
  network_passphrase: "Example Network ; 2026",
  current_protocol_version: 23,
  supported_protocol_version: 23,
  core_supported_protocol_version: 23,
};

/** A Soroban RPC-style answer: JSON, but not a Horizon root. */
const NOT_HORIZON = { jsonrpc: "2.0", id: 1, error: { code: -32600, message: "invalid request" } };

const FORM = {
  name: "Local validator",
  horizonUrl: "https://horizon.example/",
  rpcUrl: "https://rpc.example/",
  passphrase: "Example Network ; 2026",
};

function response(body, { status = 200, url = "https://horizon.example/" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    json: () => Promise.resolve(body),
  };
}

let storage;

beforeEach(() => {
  storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  removeCustomNetwork();
  setActiveNetwork("TESTNET");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("looksLikeHorizonRoot", () => {
  it("accepts a Horizon root fixture", () => {
    expect(looksLikeHorizonRoot(HORIZON_ROOT)).toBe(true);
  });

  it("rejects bodies that are not a Horizon root", () => {
    expect(looksLikeHorizonRoot(NOT_HORIZON)).toBe(false);
    expect(looksLikeHorizonRoot({ ...HORIZON_ROOT, horizon_version: undefined })).toBe(false);
    expect(looksLikeHorizonRoot({ ...HORIZON_ROOT, network_passphrase: "" })).toBe(false);
    expect(looksLikeHorizonRoot({ ...HORIZON_ROOT, _links: undefined })).toBe(false);
    expect(looksLikeHorizonRoot(null)).toBe(false);
    expect(looksLikeHorizonRoot("<html>")).toBe(false);
  });
});

describe("fetchHorizonRoot", () => {
  it("requests the root over HTTPS and returns a Horizon body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(HORIZON_ROOT));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHorizonRoot("https://horizon.example")).resolves.toEqual(HORIZON_ROOT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://horizon.example/");
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("never requests a plain HTTP URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHorizonRoot("http://horizon.example")).rejects.toThrow(/HTTPS/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a redirect to HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(HORIZON_ROOT, { url: "http://horizon.example/" }))
    );

    await expect(fetchHorizonRoot("https://horizon.example")).rejects.toThrow(
      /redirected to a non-HTTPS URL/
    );
  });

  it("refuses an answer that is not Horizon", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(NOT_HORIZON)));

    await expect(fetchHorizonRoot("https://horizon.example")).rejects.toThrow(
      /did not answer like a Horizon server/
    );
  });

  it("refuses an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, { status: 404 })));

    await expect(fetchHorizonRoot("https://horizon.example")).rejects.toThrow(/answered 404/);
  });

  it("refuses a timeout with a timeout message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        })
      )
    );

    await expect(fetchHorizonRoot("https://horizon.example", { timeoutMs: 20 })).rejects.toThrow(
      /did not answer within 0.02 seconds/
    );
  });
});

describe("saveVerifiedCustomNetwork", () => {
  it("saves the network after the Horizon root answers like Horizon", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(HORIZON_ROOT)));

    const network = await saveVerifiedCustomNetwork(FORM);

    expect(network).toMatchObject({ id: "CUSTOM", horizonUrl: "https://horizon.example" });
    expect(getNetworkById("CUSTOM")).toMatchObject({ label: "Local validator" });
    expect(storage.setItem).toHaveBeenCalledWith(CUSTOM_NETWORK_STORAGE_KEY, expect.any(String));
  });

  it("saves nothing when the URL is not Horizon", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(NOT_HORIZON)));

    await expect(saveVerifiedCustomNetwork(FORM)).rejects.toThrow(/Horizon/);
    expect(getAvailableNetworks().map(({ id }) => id)).not.toContain("CUSTOM");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("saves nothing on a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        })
      )
    );

    await expect(saveVerifiedCustomNetwork(FORM, { timeoutMs: 20 })).rejects.toThrow(
      /did not answer within/
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("keeps an earlier custom network when a new one is refused", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(HORIZON_ROOT)));
    await saveVerifiedCustomNetwork(FORM);
    storage.setItem.mockClear();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(NOT_HORIZON)));
    await expect(
      saveVerifiedCustomNetwork({ ...FORM, name: "Wrong", horizonUrl: "https://rpc.example" })
    ).rejects.toThrow(/Horizon/);

    expect(getNetworkById("CUSTOM")).toMatchObject({ label: "Local validator" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not request anything when the form itself is invalid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      saveVerifiedCustomNetwork({ ...FORM, horizonUrl: "http://horizon.example" })
    ).rejects.toThrow(/HTTPS/);
    await expect(saveVerifiedCustomNetwork({ ...FORM, passphrase: " " })).rejects.toThrow(
      /passphrase/i
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
