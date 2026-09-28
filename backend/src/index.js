import express from "express";
import cors from "cors";
import * as StellarSdk from "@stellar/stellar-sdk";
import { mapBalances } from "./mapBalances.js";

const PORT = Number(process.env.PORT) || 8787;
const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK = process.env.NETWORK || "TESTNET";
const FRIENDBOT_URL =
  process.env.FRIENDBOT_URL || "https://friendbot.stellar.org";
const EXPLORER_BASE =
  process.env.EXPLORER_BASE || "https://stellar.expert/explorer/testnet";
const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

/** Per-IP rate limiting on /api/* (in-memory, no external store) */
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60;

/** Optional: set after deploying contracts/kitewell on Testnet */
const KITEWELL_CONTRACT_ID = process.env.KITEWELL_CONTRACT_ID || null;

const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const app = express();

/** One JSON log line per request: method, path, status, ms */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 10) / 10;
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

/** Fixed-window per-IP rate limiter */
const ipBuckets = new Map(); // ip -> { count, resetAt }

function rateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let bucket = ipBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipBuckets.set(key, bucket);
  }
  bucket.count += 1;

  // Opportunistic cleanup so stale IPs don't grow the map unbounded.
  if (ipBuckets.size > 5_000) {
    for (const [k, b] of ipBuckets) {
      if (b.resetAt <= now) ipBuckets.delete(k);
    }
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  res.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

  if (bucket.count > RATE_LIMIT_MAX) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({
      error: "Too many requests",
      retryAfterMs: bucket.resetAt - now,
    });
  }
  next();
}

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
    passphrase: StellarSdk.Networks.TESTNET,
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

app.listen(PORT, () => {
  console.log(`Kitewell backend listening on http://localhost:${PORT}`);
  console.log(`Network: ${NETWORK} · Horizon: ${HORIZON_URL}`);
});
