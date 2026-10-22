# Block explorer link builder

`frontend/src/explorerLinkBuilder.js` constructs deep links to Stellar block explorers (stellar.expert or custom baseUrl) for account, transaction, and operation entities after validating entity identifier shapes.

## What it does

- Validates entity identifier formats per type:
  - `account`: 56-character `G`-prefixed Base32 Ed25519 public key.
  - `tx` / `transaction`: 64-character hexadecimal hash.
  - `op` / `operation`: Numeric digit ID.
- Supports `public`, `testnet`, and `futurenet` network prefixes.
- Normalizes alias types (`transaction` -> `tx`, `operation` -> `op`).
- Supports configurable base URLs with automatic trailing slash cleanup.

## Public API

### `buildExplorerLink(type, id, options)`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `string` | — | Entity type: `"account"`, `"tx"`, `"op"`, `"transaction"`, or `"operation"` |
| `id` | `string \| number \| bigint` | — | Entity identifier |
| `options.network` | `string` | `"testnet"` | Target Stellar network (`"public"`, `"testnet"`, `"futurenet"`) |
| `options.baseUrl` | `string` | `"https://stellar.expert/explorer"` | Custom block explorer URL prefix |

### `validateEntityId(type, id)`

Validates that `id` matches the expected format for `type`, returning the trimmed ID or throwing `TypeError` / `RangeError`.

### Examples

```js
import { buildExplorerLink } from "./explorerLinkBuilder";

buildExplorerLink("account", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
// => "https://stellar.expert/explorer/testnet/account/GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

buildExplorerLink("tx", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", { network: "public" });
// => "https://stellar.expert/explorer/public/tx/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```
