import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CI-friendly test suite for the Kitewell stellar helpers.
 *
 * Nothing here touches the network or a Freighter wallet:
 * - `./api` is mocked so the "backend-backed" paths are simulated.
 * - The Horizon `Server` is mocked so the "Horizon fallback" paths are simulated.
 * - `globalThis.fetch` is stubbed for Friendbot funding.
 */

vi.mock("./api", () => ({
  fetchAccountViaApi: vi.fn(),
  fetchPaymentsViaApi: vi.fn(),
}));

const { loadAccountMock, paymentsCallMock, orderBookCallMock, claimableCallMock, assetCallMock } = vi.hoisted(() => ({
  loadAccountMock: vi.fn(),
  paymentsCallMock: vi.fn(),
  orderBookCallMock: vi.fn(),
  claimableCallMock: vi.fn(),
  assetCallMock: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return {
          loadAccount: loadAccountMock,
          payments: () => ({
            forAccount: () => ({
              limit: () => ({
                order: () => ({ call: paymentsCallMock }),
              }),
            }),
          }),
          orderbook: (selling, buying) => ({
            limit: () => ({
              call: () => orderBookCallMock(selling, buying),
            }),
          }),
          claimableBalances: () => ({
            forSponsor: () => ({ limit: () => ({ call: claimableCallMock }) }),
          }),
          assets: () => ({
            forCode: () => ({ forIssuer: () => ({ call: assetCallMock }) }),
          }),
        };
      }),
    },
  };
});

const { fetchAccountViaApi, fetchPaymentsViaApi } = await import("./api");
const StellarSdk = await import("@stellar/stellar-sdk");
const {
  buildAsset,
  explorerAccountUrl,
  explorerTxUrl,
  fundWithFriendbot,
  getAccountBalances,
  getAccountDetails,
  getBalance,
  getTransactions,
  getOrderBook,
  parsePathAssets,
  withHorizon429Backoff,
  resetHorizon429BackoffForTests,
  HORIZON_SLOWDOWN_MESSAGE,
  computeHorizon429WaitSeconds,
} = await import("./stellar");

/** Minimal Horizon account payload: 3.5 XLM + an issued asset. */
function horizonAccountFixture() {
  return {
    id: "GTEST",
    sequenceNumber: () => "123",
    subentry_count: 2,
    thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
    balances: [
      {
        asset_type: "native",
        balance: "3.5000000",
      },
      {
        asset_type: "credit_alphanum4",
        asset_code: "FOO",
        asset_issuer: "GISSUER",
        balance: "11.0000000",
        limit: "1000.0000000",
        is_authorized: false,
        is_authorized_to_maintain_liabilities: true,
        clawback_enabled: false,
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  loadAccountMock.mockReset();
  paymentsCallMock.mockReset();
  orderBookCallMock.mockReset();
  claimableCallMock.mockReset();
  assetCallMock.mockReset();
  resetHorizon429BackoffForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetHorizon429BackoffForTests();
});

describe("explorer urls", () => {
  it("builds account and tx explorer urls on the testnet base", () => {
    expect(explorerAccountUrl("GTEST")).toBe(
      "https://stellar.expert/explorer/testnet/account/GTEST"
    );
    expect(explorerTxUrl("hash123")).toBe(
      "https://stellar.expert/explorer/testnet/tx/hash123"
    );
  });
});

describe("asset + path helpers", () => {
  const issuer = StellarSdk.Keypair.random().publicKey();

  it("builds a native XLM asset", () => {
    expect(buildAsset({ isNative: true }).isNative()).toBe(true);
  });

  it("builds a credit asset and upper-cases the code", () => {
    const asset = buildAsset({ isNative: false, code: "usdc", issuer });
    expect(asset.getCode()).toBe("USDC");
    expect(asset.getIssuer()).toBe(issuer);
  });

  it("rejects missing codes, bad issuers, and over-long codes", () => {
    expect(() => buildAsset({ isNative: false })).toThrow(/code is required/);
    expect(() =>
      buildAsset({ isNative: false, code: "USDC", issuer: "not-a-key" })
    ).toThrow(/valid Stellar public key/);
    expect(() =>
      buildAsset({ isNative: false, code: "TOOLONGCODE123", issuer })
    ).toThrow(/12 characters or fewer/);
  });

  it("parses an empty path to nothing", () => {
    expect(parsePathAssets("")).toEqual([]);
    expect(parsePathAssets("   ")).toEqual([]);
    expect(parsePathAssets(undefined)).toEqual([]);
  });

  it("parses native and credit hops", () => {
    const path = parsePathAssets(`USDC:${issuer}, xlm`);
    expect(path).toHaveLength(2);
    expect(path[0].getCode()).toBe("USDC");
    expect(path[0].getIssuer()).toBe(issuer);
    expect(path[1].isNative()).toBe(true);
  });

  it("rejects a credit hop without an issuer", () => {
    expect(() => parsePathAssets("USDC")).toThrow(/needs an issuer/);
  });
});

describe("getOrderBook", () => {
  const issuer = StellarSdk.Keypair.random().publicKey();

  it("limits and maps fixture bids and asks", async () => {
    orderBookCallMock.mockResolvedValue({
      bids: Array.from({ length: 12 }, (_, index) => ({ amount: `${index + 1}`, price: `${index + 2}` })),
      asks: [{ amount: "4", price: "1.25" }],
    });

    await expect(getOrderBook(StellarSdk.Asset.native(), new StellarSdk.Asset("USDC", issuer)))
      .resolves.toEqual({
        bids: Array.from({ length: 10 }, (_, index) => ({ amount: `${index + 1}`, price: `${index + 2}`, priceR: undefined })),
        asks: [{ amount: "4", price: "1.25", priceR: undefined }],
      });
    expect(orderBookCallMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a same-asset pair before Horizon", async () => {
    await expect(getOrderBook(StellarSdk.Asset.native(), StellarSdk.Asset.native()))
      .rejects.toThrow("Selling and buying assets must be different.");
    expect(orderBookCallMock).not.toHaveBeenCalled();
  });

  it("preserves an empty book as empty arrays", async () => {
    orderBookCallMock.mockResolvedValue({ bids: [], asks: [] });
    await expect(getOrderBook(StellarSdk.Asset.native(), new StellarSdk.Asset("USDC", issuer)))
      .resolves.toEqual({ bids: [], asks: [] });
  });
});

describe("order book read", () => {
  const issuer = StellarSdk.Keypair.random().publicKey();

  it("loads the selected selling and buying assets", async () => {
    const selling = StellarSdk.Asset.native();
    const buying = new StellarSdk.Asset("USDC", issuer);
    const fixture = { asks: [{ price: "2", amount: "10" }], bids: [] };
    orderBookCallMock.mockResolvedValue(fixture);

    await expect(getOrderBook(selling, buying)).resolves.toEqual({
      asks: [{ ...fixture.asks[0], priceR: undefined }],
      bids: [],
    });
    expect(orderBookCallMock).toHaveBeenCalledWith(selling, buying);
  });

  it("refuses an invalid pair before calling Horizon", async () => {
    const native = StellarSdk.Asset.native();
    await expect(getOrderBook(native, native)).rejects.toThrow(
      "Selling and buying assets must be different."
    );
    await expect(getOrderBook(null, native)).rejects.toThrow(/two different valid assets/);
    expect(orderBookCallMock).not.toHaveBeenCalled();
  });
});

describe("fundWithFriendbot", () => {
  it("returns the friendbot JSON on success", async () => {
    const body = { hash: "abc123", successful: true };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => body })
    );

    await expect(fundWithFriendbot("GTEST")).resolves.toEqual(body);
    expect(fetch).toHaveBeenCalledWith(
      "https://friendbot.stellar.org?addr=GTEST"
    );
  });

  it("maps friendbot failures to a friendly error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("oops"),
      })
    );

    await expect(fundWithFriendbot("GTEST")).rejects.toThrow(
      "Account may already be funded. Refresh balances instead."
    );
  });
});

describe("getBalance", () => {
  it("returns the native XLM balance", async () => {
    fetchAccountViaApi.mockResolvedValue({
      balances: [
        { key: "FOO:GISSUER", code: "FOO", balance: "11.0000000", isNative: false },
        { key: "native", code: "XLM", balance: "3.5000000", isNative: true },
      ],
    });

    await expect(getBalance("GTEST")).resolves.toBe("3.5000000");
    expect(fetchAccountViaApi).toHaveBeenCalledWith("GTEST");
  });

  it("falls back to Horizon and reports 0 when no native balance exists", async () => {
    fetchAccountViaApi.mockRejectedValue(new Error("backend down"));
    loadAccountMock.mockResolvedValue({
      balances: [
        {
          asset_type: "credit_alphanum4",
          asset_code: "FOO",
          asset_issuer: "GISSUER",
          balance: "1.0000000",
          limit: "10.0000000",
        },
      ],
    });

    await expect(getBalance("GTEST")).resolves.toBe("0");
    expect(loadAccountMock).toHaveBeenCalledWith("GTEST");
  });
});

describe("balance mapping", () => {
  it("passes through backend-mapped balances untouched", async () => {
    fetchAccountViaApi.mockResolvedValue({
      balances: [
        { key: "native", code: "XLM", issuer: null, balance: "3.5000000", limit: null, isNative: true },
        {
          key: "FOO:GISSUER",
          code: "FOO",
          issuer: "GISSUER",
          balance: "11.0000000",
          limit: "1000.0000000",
          isNative: false,
          isAuthorized: false,
          isAuthorizedToMaintainLiabilities: true,
          clawbackEnabled: false,
        },
      ],
    });

    await expect(getAccountBalances("GTEST")).resolves.toEqual([
      { key: "native", code: "XLM", issuer: null, balance: "3.5000000", limit: null, isNative: true },
      {
        key: "FOO:GISSUER",
        code: "FOO",
        issuer: "GISSUER",
        balance: "11.0000000",
        limit: "1000.0000000",
        isNative: false,
        isAuthorized: false,
        isAuthorizedToMaintainLiabilities: true,
        clawbackEnabled: false,
      },
    ]);
  });

  it("normalizes raw Horizon balances on the fallback path", async () => {
    fetchAccountViaApi.mockRejectedValue(new Error("backend down"));
    loadAccountMock.mockResolvedValue(horizonAccountFixture());

    await expect(getAccountBalances("GTEST")).resolves.toEqual([
      {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: "3.5000000",
        limit: null,
        isNative: true,
        sellingLiabilities: "0.0000000",
        buyingLiabilities: "0.0000000",
        available: "1.5000000", // 3.5 - (0.5 * (2 + 2)) = 1.5
      },
      {
        key: "FOO:GISSUER",
        code: "FOO",
        issuer: "GISSUER",
        balance: "11.0000000",
        limit: "1000.0000000",
        isNative: false,
        isAuthorized: false,
        isAuthorizedToMaintainLiabilities: true,
        clawbackEnabled: false,
        sellingLiabilities: "0.0000000",
        buyingLiabilities: "0.0000000",
        available: "11.0000000",
      },
    ]);
  });

  it("enriches account details with explorer url on the fallback path", async () => {
    fetchAccountViaApi.mockRejectedValue(new Error("backend down"));
    loadAccountMock.mockResolvedValue(horizonAccountFixture());

    const details = await getAccountDetails("GTEST");
    expect(details).toMatchObject({
      id: "GTEST",
      sequence: "123",
      subentryCount: 2,
      balances: expect.arrayContaining([
        expect.objectContaining({ code: "XLM", isNative: true }),
        expect.objectContaining({ code: "FOO", isNative: false }),
      ]),
      explorerUrl: "https://stellar.expert/explorer/testnet/account/GTEST",
    });
  });
});

describe("Horizon 429 backoff", () => {
  function horizon429(retryAfter) {
    const error = new Error("Too Many Requests");
    error.response = {
      status: 429,
      headers: retryAfter == null ? {} : { "retry-after": String(retryAfter) },
    };
    return error;
  }

  it("stubs two 429s and asserts the second wait is longer", async () => {
    const waits = [];
    const sleep = vi.fn(async (ms) => {
      waits.push(ms);
    });

    const read = vi
      .fn()
      .mockRejectedValueOnce(horizon429())
      .mockRejectedValueOnce(horizon429());

    await expect(withHorizon429Backoff(read, { sleep })).rejects.toThrow(
      HORIZON_SLOWDOWN_MESSAGE
    );
    await expect(withHorizon429Backoff(read, { sleep })).rejects.toThrow(
      HORIZON_SLOWDOWN_MESSAGE
    );

    expect(waits).toEqual([2000, 4000]);
    expect(waits[1]).toBeGreaterThan(waits[0]);
    expect(computeHorizon429WaitSeconds(1)).toBe(2);
    expect(computeHorizon429WaitSeconds(2)).toBe(4);
    expect(computeHorizon429WaitSeconds(5)).toBe(30);
  });

  it("prefers Retry-After when Horizon sends it", async () => {
    const waits = [];
    const sleep = vi.fn(async (ms) => {
      waits.push(ms);
    });

    await expect(
      withHorizon429Backoff(() => Promise.reject(horizon429(7)), { sleep })
    ).rejects.toThrow(HORIZON_SLOWDOWN_MESSAGE);

    expect(waits).toEqual([7000]);
  });

  it("resets the shared backoff clock after a successful read", async () => {
    const waits = [];
    const sleep = vi.fn(async (ms) => {
      waits.push(ms);
    });

    await expect(
      withHorizon429Backoff(() => Promise.reject(horizon429()), { sleep })
    ).rejects.toThrow(HORIZON_SLOWDOWN_MESSAGE);

    await expect(
      withHorizon429Backoff(async () => "ok", { sleep })
    ).resolves.toBe("ok");

    await expect(
      withHorizon429Backoff(() => Promise.reject(horizon429()), { sleep })
    ).rejects.toThrow(HORIZON_SLOWDOWN_MESSAGE);

    expect(waits).toEqual([2000, 2000]);
  });

  it("does not apply 429 backoff to a 500", async () => {
    const sleep = vi.fn(async () => {});
    const serverError = new Error("Internal Server Error");
    serverError.response = { status: 500 };

    await expect(
      withHorizon429Backoff(() => Promise.reject(serverError), { sleep })
    ).rejects.toThrow("Internal Server Error");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("cancels the wait when the signal aborts", async () => {
    const controller = new AbortController();
    const sleep = vi.fn(
      (_ms, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true }
          );
          controller.abort();
        })
    );

    await expect(
      withHorizon429Backoff(() => Promise.reject(horizon429()), {
        signal: controller.signal,
        sleep,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("lets two Horizon callers share one backoff clock per network", async () => {
    const waits = [];
    const sleep = vi.fn(async (ms) => {
      waits.push(ms);
    });

    fetchAccountViaApi.mockRejectedValue(new Error("backend down"));
    fetchPaymentsViaApi.mockRejectedValue(new Error("backend down"));
    loadAccountMock.mockRejectedValue(horizon429());
    paymentsCallMock.mockRejectedValue(horizon429());

    await expect(
      getAccountBalances("GTEST", { sleep })
    ).rejects.toThrow(HORIZON_SLOWDOWN_MESSAGE);
    await expect(
      getTransactions("GTEST", 15, undefined, { sleep })
    ).rejects.toThrow(HORIZON_SLOWDOWN_MESSAGE);

    expect(waits).toEqual([2000, 4000]);
    expect(waits[1]).toBeGreaterThan(waits[0]);
  });
});

describe("getTransactions", () => {
  it("returns the backend payment page when the API works", async () => {
    const records = [
      {
        id: "p1",
        from: "GALICE",
        to: "GTEST",
        amount: "1.0000000",
        asset_type: "native",
        asset_code: "XLM",
        transaction_hash: "h1",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const page = { records, nextCursor: "cursor-1" };
    fetchPaymentsViaApi.mockResolvedValue(page);

    await expect(getTransactions("GTEST")).resolves.toEqual(page);
    expect(fetchPaymentsViaApi).toHaveBeenCalledWith("GTEST", 15, undefined);
  });

  it("filters to payments and defaults non-native asset codes to XLM on fallback", async () => {
    fetchPaymentsViaApi.mockRejectedValue(new Error("backend down"));
    paymentsCallMock.mockResolvedValue({
      records: [
        {
          type: "payment",
          id: "p1",
          from: "GALICE",
          to: "GTEST",
          amount: "1.0000000",
          asset_type: "native",
          transaction_hash: "h1",
          created_at: "2026-01-01T00:00:00Z",
        },
        { type: "create_account", id: "skip-me" },
      ],
    });

    await expect(getTransactions("GTEST")).resolves.toEqual({
      records: [
        {
          id: "p1",
          from: "GALICE",
          to: "GTEST",
          amount: "1.0000000",
          asset_type: "native",
          asset_code: "XLM",
          transaction_hash: "h1",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      // Paging straight off Horizon is out of scope, so this path ends here.
      nextCursor: null,
    });
    expect(paymentsCallMock).toHaveBeenCalledTimes(1);
  });
});

describe("getClaimableBalances", () => {
  it("lists only creator balances and enables clawback only for an issuer asset", async () => {
    const { getClaimableBalances } = await import("./stellar");
    claimableCallMock.mockResolvedValue({
      records: [
        {
          id: "a".repeat(64),
          asset: "KITE:GTEST",
          amount: "4.0000000",
          sponsor: "GCREATOR",
          last_modified_time: "2026-01-01T00:00:00Z",
        },
        { id: "b".repeat(64), asset: "KITE:GOTHER", amount: "2", sponsor: "OTHER" },
      ],
    });
    assetCallMock.mockResolvedValue({
      records: [{ flags: { auth_clawback_enabled: true } }],
    });

    await expect(getClaimableBalances("GCREATOR")).resolves.toEqual([
      expect.objectContaining({
        id: "a".repeat(64),
        code: "KITE",
        issuer: "GTEST",
        createdByAccount: true,
        clawbackEnabled: true,
      }),
    ]);
    expect(claimableCallMock).toHaveBeenCalledTimes(1);
  });

  it("hides clawback when the issuer asset does not allow clawback", async () => {
    const { getClaimableBalances } = await import("./stellar");
    claimableCallMock.mockResolvedValue({
      records: [{ id: "c".repeat(64), asset: "KITE:GISSUER", sponsor: "GISSUER" }],
    });
    assetCallMock.mockResolvedValue({ records: [{ flags: { auth_clawback_enabled: false } }] });

    await expect(getClaimableBalances("GISSUER")).resolves.toEqual([
      expect.objectContaining({ clawbackEnabled: false }),
    ]);
  });
});
