# Muxed account address splitter and combiner

`backend/src/muxedAddressSplit.js` implements SEP-0023 / CAP-0027 MED25519 muxed account address splitting and combining using only public, non-secret fields. The module is standalone; API route wiring (`app.js`, `index.js`) is out of scope.

## What it does

- Splits a Stellar `M...` muxed account address into its base `G...` Ed25519 public key and its 64-bit unsigned numeric integer ID string.
- Combines a base `G...` Ed25519 public key and a 64-bit unsigned numeric ID (`number`, `string`, or `bigint`) into a canonical `M...` muxed account address.
- Validates addresses and 64-bit ID bounds (`0` to `2^64 - 1` = `18446744073709551615`).
- Supports optional passthrough of un-muxed `G...` addresses via `allowBaseAddress: true`.
- Provides fast address classification predicates (`isMuxedAddress`, `isBaseAddress`).

## Public API

### `splitMuxedAddress(address, options)`

Splits an `M...` address into its constituent base address and ID.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `address` | `string` | — | Stellar `M...` address |
| `options.allowBaseAddress` | `boolean` | `false` | If `true`, permits raw `G...` addresses, returning `{ baseAddress: address, id: null, isMuxed: false }` |

```js
import { splitMuxedAddress } from "./muxedAddressSplit.js";

const result = splitMuxedAddress("MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU");
// => {
//   baseAddress: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
//   id: "12345",
//   isMuxed: true
// }
```

### `combineMuxedAddress(baseAddress, id)`

Combines a base `G...` address and 64-bit ID into an `M...` address.

| Parameter | Type | Description |
| --- | --- | --- |
| `baseAddress` | `string` | Stellar `G...` public key |
| `id` | `number|string|bigint` | 64-bit unsigned ID (`0` to `18446744073709551615`) |

```js
import { combineMuxedAddress } from "./muxedAddressSplit.js";

const muxed = combineMuxedAddress("GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ", 12345);
// => "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAABQHF6OU"
```

### `isMuxedAddress(address)`

Returns `true` if `address` is a valid Stellar `M...` address.

### `isBaseAddress(address)`

Returns `true` if `address` is a valid Stellar `G...` address.

### `MuxedAddressSplitError`

Custom error class thrown when muxed address validation or encoding/decoding fails.

### `MAX_UINT64`

Constant representing `18446744073709551615n`.

## Notes

- Tests live next to the module in `backend/src/muxedAddressSplit-*.test.js` and run with `npm test` from `backend/`.
- No existing files or routes are modified.
