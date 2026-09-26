# Kitewell Backend API

Base URL: `http://localhost:8787` (default).

---

## GET /health

Liveness check.

**Success — 200**

```json
{
  "ok": true,
  "service": "kitewell-backend",
  "network": "TESTNET",
  "horizon": "https://horizon-testnet.stellar.org"
}
```

---

## GET /api/network

Returns network configuration and contract status.

**Success — 200**

```json
{
  "network": "TESTNET",
  "horizonUrl": "https://horizon-testnet.stellar.org",
  "friendbotUrl": "https://friendbot.stellar.org",
  "explorerBase": "https://stellar.expert/explorer/testnet",
  "passphrase": "Test SDF Network ; September 2015",
  "contract": {
    "kitewell": null,
    "status": "not_deployed"
  }
}
```

`contract.status` is `"configured"` when `KITEWELL_CONTRACT_ID` is set.

---

## GET /api/account/:address

Loads an account from Horizon and returns balances.

**Path params**

| Param | Description |
|-------|-------------|
| `address` | Stellar public key (Ed25519) |

**Success — 200**

```json
{
  "id": "GABC…",
  "sequence": "123456789",
  "subentryCount": 0,
  "thresholds": { "low": 0, "med": 0, "high": 0 },
  "balances": [
    {
      "key": "native",
      "code": "XLM",
      "issuer": null,
      "balance": "100.0000000",
      "limit": null,
      "isNative": true
    }
  ],
  "explorerUrl": "https://stellar.expert/explorer/testnet/account/GABC…"
}
```

**Errors**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Invalid Stellar public key" }` | Bad address format |
| 404 | `{ "error": "Account not found on Testnet. Fund with Friendbot first." }` | Account doesn't exist |
| 502 | `{ "error": "Horizon request failed", "detail": "…" }` | Horizon unreachable |

---

## GET /api/payments/:address

Returns recent payments for an account, newest first.

**Path params**

| Param | Description |
|-------|-------------|
| `address` | Stellar public key (Ed25519) |

**Query params**

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | 15 | 50 | Number of payments to return |

**Success — 200**

```json
{
  "records": [
    {
      "id": "123…",
      "from": "GABC…",
      "to": "GDEF…",
      "amount": "10.0000000",
      "asset_type": "native",
      "asset_code": "XLM",
      "transaction_hash": "abc123…",
      "created_at": "2025-01-15T12:00:00Z",
      "explorerUrl": "https://stellar.expert/explorer/testnet/tx/abc123…"
    }
  ]
}
```

Only records with `type === "payment"` are returned.

**Errors**

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Invalid Stellar public key" }` | Bad address format |
| 502 | `{ "error": "Could not load payments", "detail": "…" }` | Horizon unreachable |
