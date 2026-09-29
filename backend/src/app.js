import express from "express";
import cors from "cors";
import * as StellarSdk from "@stellar/stellar-sdk";
import { mapBalances } from "./mapBalances.js";
import { createRateLimiter } from "./rateLimit.js";
import { resolveNetwork } from "./networkConfig.js";

/**
 * Build the Kitewell Express app.
 *
 * Every piece of ambient state (env vars, Horizon server, rate-limit buckets)
 * is created per call so tests can exercise routes without network access or
 * module-load side effects.
 *
 * @param {object} [options]
 * @param {object} [options.horizon] Horizon server to use; defaults to a real
 *   `StellarSdk.Horizon.Server` pointed at `HORIZON_URL`.
 * @param {Record<string, string|undefined>} [options.env] Environment source;
 *   defaults to `process.env`.
 * @returns {import("express").Express} The configured app (not listening).
 */
export function createApp({ horizon, env = process.env } = {}) {
  const {
    network: NETWORK,
    passphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
    friendbotUrl: FRIENDBOT_URL,
    explorerBase: EXPLORER_BASE,
    sorobanRpcUrl: SOROBAN_RPC_URL,
  } = resolveNetwork(env);

  /** Per-IP rate limiting on /api/* (in-memory, no external store) */
  const RATE_LIMIT_WINDOW_MS = Number(env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const RATE_LIMIT_MAX = Number(env.RATE_LIMIT_MAX) || 60;

  /** Optional: set after deploying contracts/kitewell on Testnet */
  const KITEWELL_CONTRACT_ID = env.KITEWELL_CONTRACT_ID || null;

  const server = horizon || new StellarSdk.Horizon.Server(HORIZON_URL);
  const app = express();

  /** One JSON log line per request: method, path, status, ms */
  function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms =
        Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 10) / 10;
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms,
        }),
      );
    });
    next();
  }

  /** Fixed-window per-IP rate limiter (own bucket map per app) */
  const rateLimit = createRateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
  });

  app.use(cors({ origin: true }));
  app.use(express.json());
  app.use(requestLogger);
  app.use("/api", rateLimit);

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "kitewell-backend",
      network: NETWORK,
      horizon: HORIZON_URL,
    });
  });

  app.get("/api/network", (_req, res) => {
    res.json({
      network: NETWORK,
      horizonUrl: HORIZON_URL,
      friendbotUrl: FRIENDBOT_URL,
      explorerBase: EXPLORER_BASE,
      sorobanRpcUrl: SOROBAN_RPC_URL,
      passphrase: NETWORK_PASSPHRASE,
      contract: {
        kitewell: KITEWELL_CONTRACT_ID,
        status: KITEWELL_CONTRACT_ID ? "configured" : "not_deployed",
      },
    });
  });

  app.get("/api/account/:address", async (req, res) => {
    const { address } = req.params;
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
      return res.status(400).json({ error: "Invalid Stellar public key" });
    }

    try {
      const account = await server.loadAccount(address);
      const balances = mapBalances(account.balances);

      res.json({
        id: account.id,
        sequence: account.sequenceNumber(),
        subentryCount: account.subentry_count,
        thresholds: account.thresholds,
        balances,
        explorerUrl: `${EXPLORER_BASE}/account/${address}`,
      });
    } catch (err) {
      const status = err?.response?.status || 404;
      res.status(status === 404 ? 404 : 502).json({
        error:
          status === 404
            ? "Account not found on Testnet. Fund with Friendbot first."
            : "Horizon request failed",
        detail: err?.message,
      });
    }
  });

  app.get("/api/payments/:address", async (req, res) => {
    const { address } = req.params;
    const limit = Math.min(Number(req.query.limit) || 15, 50);

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
      return res.status(400).json({ error: "Invalid Stellar public key" });
    }

    try {
      const payments = await server
        .payments()
        .forAccount(address)
        .limit(limit)
        .order("desc")
        .call();

      const records = payments.records
        .filter((p) => p.type === "payment")
        .map((p) => ({
          id: p.id,
          from: p.from,
          to: p.to,
          amount: p.amount,
          asset_type: p.asset_type,
          asset_code: p.asset_code || "XLM",
          transaction_hash: p.transaction_hash,
          created_at: p.created_at,
          explorerUrl: `${EXPLORER_BASE}/tx/${p.transaction_hash}`,
        }));

      res.json({ records });
    } catch (err) {
      res.status(502).json({
        error: "Could not load payments",
        detail: err?.message,
      });
    }
  });

  return app;
}
