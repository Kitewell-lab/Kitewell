# Kitewell

![Demo](https://img.shields.io/badge/demo-🌐-brightgreen)

**Kitewell** is an open-source Stellar Testnet monorepo for builders and [Stellar Wave / Drips](https://www.drips.network/wave/stellar) contributors.

When you apply the repo on Drips, tag / describe it across all three layers:

| Layer | Path | Role |
|-------|------|------|
| **Frontend** | `frontend/` | React + Vite + Freighter wallet lab UI |
| **Backend** | `backend/` | Express API — Horizon helpers, network + contract config |
| **Contract** | `contracts/kitewell/` | Soroban registry (`register` / `get_builder` / `lab_name`) |

## Architecture

```
kitewell/
├── frontend/          # Freighter connect, fund, trustlines, send, history, lab panel
├── backend/           # /health, /api/network, /api/account, /api/payments
├── contracts/         # Soroban kitewell crate
├── docs/              # Wave backlog notes
└── README.md
```

## Quick start

```bash
# install JS workspaces
npm install

# terminal 1 — API
npm run dev:backend

# terminal 2 — UI (http://localhost:5173)
npm run dev:frontend
```

Freighter must be on **Testnet**.

## Backend configuration

The backend (`backend/`) is configured entirely through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | HTTP port the API listens on |
| `HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon API base URL |
| `NETWORK` | `TESTNET` | Network label reported by `/health` and `/api/network` |
| `FRIENDBOT_URL` | `https://friendbot.stellar.org` | Friendbot funding endpoint |
| `EXPLORER_BASE` | `https://stellar.expert/explorer/testnet` | Block explorer base for deep links |
| `KITEWELL_CONTRACT_ID` | _(unset)_ | Soroban contract ID once `contracts/kitewell` is deployed |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Fixed-window duration for the per-IP rate limiter on `/api/*` |
| `RATE_LIMIT_MAX` | `60` | Max requests per IP per window; excess requests get `429` with a `Retry-After` header |

Rate limiting is per-IP and in-memory (no external store); responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers. Every request emits one structured JSON log line with `method`, `path`, `status`, and `ms`.

## Demo

The frontend is deployed at https://kitewell.vercel.app or https://kitewell.github.io/kitewell/

### Contracts

```bash
rustup target add wasm32v1-none
cargo test --manifest-path contracts/kitewell/Cargo.toml
cargo build --manifest-path contracts/Cargo.toml --target wasm32v1-none --release
```

Deploy steps: [contracts/README.md](./contracts/README.md). After deploy, set `KITEWELL_CONTRACT_ID` for the backend.

### Tests (JS)

```bash
npm test
```

Vitest suite in `frontend/src/stellar.test.js` covers the stellar helpers (explorer URLs, Friendbot funding, balance/payment mapping, backend → Horizon fallback) with mocked Horizon SDK and API calls — CI-friendly, no Freighter wallet or network access required.

## Features

- Freighter connect / disconnect (`setAllowed`, `getAddress`, `signTransaction`)
- Friendbot funding
- Balances + `changeTrust` (open a trustline or remove an empty one)
- Native XLM payments + history
- Backend-backed account/payment reads (Horizon fallback)
- Lab panel for API + contract status
- Lab tab Soroban registry: Freighter-signed `register(caller, name)` check-in + `lab_name` / `builder_count` / `get_builder` reads

Send supports optional text memos up to 28 UTF-8 bytes, uint64 ID memos, and 32-byte hash memos.

## Drips Wave application tip

In the maintainer apply flow, present Kitewell as a **full-stack Stellar lab**:

1. **Frontend** — wallet UX and Freighter integration  
2. **Backend** — Horizon aggregation API for the lab  
3. **Smart contract** — Soroban builder check-in registry  

Point reviewers at this README, `contracts/`, `backend/src/index.js`, and open issues labeled `stellar-wave`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/wave-backlog.md](./docs/wave-backlog.md).

## License

MIT — [LICENSE](./LICENSE).

## Network

Testnet only by default. No Mainnet funds.
