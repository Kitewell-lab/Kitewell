import { describe, expect, it, vi } from "vitest";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  RPC_PASSPHRASE_MATCH,
  RPC_PASSPHRASE_UNCHECKED,
  checkRpcNetworkAgreement,
  compareNetworkPassphrases,
} from "./rpcNetworkCheck";

/**
 * Issue #666: the lab reads the passphrase the Soroban RPC reports and only
 * allows contract calls when it matches the passphrase the lab signs for.
 */

const TESTNET = StellarSdk.Networks.TESTNET;
const FUTURENET = StellarSdk.Networks.FUTURENET;

function rpcServerStub(network) {
  return { getNetwork: vi.fn().mockResolvedValue(network) };
}

describe("compareNetworkPassphrases", () => {
  it("allows contract calls when the fixture passphrases match", () => {
    const result = compareNetworkPassphrases({
      labPassphrase: TESTNET,
      rpcPassphrase: TESTNET,
    });

    expect(result.status).toBe("match");
    expect(result.contractCallsAllowed).toBe(true);
    expect(result.message).toBe(RPC_PASSPHRASE_MATCH);
  });

  it("disables contract calls when the fixture passphrases differ", () => {
    const result = compareNetworkPassphrases({
      labPassphrase: TESTNET,
      rpcPassphrase: FUTURENET,
    });

    expect(result.status).toBe("mismatch");
    expect(result.contractCallsAllowed).toBe(false);
    expect(result.message).toContain("networks disagree");
    expect(result.message).toContain(FUTURENET);
    expect(result.message).toContain(TESTNET);
  });

  it("disables contract calls when the RPC reports no passphrase", () => {
    for (const rpcPassphrase of [null, undefined, "", "   "]) {
      const result = compareNetworkPassphrases({
        labPassphrase: TESTNET,
        rpcPassphrase,
      });

      expect(result.status).toBe("unchecked");
      expect(result.contractCallsAllowed).toBe(false);
      expect(result.message).toBe(RPC_PASSPHRASE_UNCHECKED);
    }
  });

  it("does not treat the mismatch rule as a Horizon payment rule", () => {
    // The return value only ever gates contract calls; nothing here disables a
    // classic payment. The panel keeps payments available on a mismatch.
    const result = compareNetworkPassphrases({
      labPassphrase: TESTNET,
      rpcPassphrase: FUTURENET,
    });

    expect(Object.keys(result).sort()).toEqual([
      "contractCallsAllowed",
      "message",
      "status",
    ]);
  });
});

describe("checkRpcNetworkAgreement", () => {
  it("reads the RPC passphrase and reports a mismatch", async () => {
    const server = rpcServerStub({ passphrase: FUTURENET });

    const result = await checkRpcNetworkAgreement({
      labPassphrase: TESTNET,
      server,
    });

    expect(server.getNetwork).toHaveBeenCalledTimes(1);
    expect(result.rpcPassphrase).toBe(FUTURENET);
    expect(result.labPassphrase).toBe(TESTNET);
    expect(result.status).toBe("mismatch");
    expect(result.contractCallsAllowed).toBe(false);
  });

  it("allows contract calls when the RPC reports the lab's passphrase", async () => {
    const result = await checkRpcNetworkAgreement({
      labPassphrase: TESTNET,
      server: rpcServerStub({ passphrase: TESTNET }),
    });

    expect(result.status).toBe("match");
    expect(result.contractCallsAllowed).toBe(true);
  });

  it("treats a missing passphrase as unchecked and disables contract calls", async () => {
    const result = await checkRpcNetworkAgreement({
      labPassphrase: TESTNET,
      server: rpcServerStub({}),
    });

    expect(result.status).toBe("unchecked");
    expect(result.rpcPassphrase).toBeNull();
    expect(result.contractCallsAllowed).toBe(false);
    expect(result.message).toBe(RPC_PASSPHRASE_UNCHECKED);
  });

  it("treats an unreachable RPC as unchecked rather than a match", async () => {
    const server = {
      getNetwork: vi.fn().mockRejectedValue(new Error("network error")),
    };

    const result = await checkRpcNetworkAgreement({
      labPassphrase: TESTNET,
      server,
    });

    expect(result.status).toBe("unchecked");
    expect(result.contractCallsAllowed).toBe(false);
    expect(result.error).toBe("network error");
  });
});
