# Asset pair canonical key builder

`buildAssetPairKey` (also exported as `assetPairKeyBuilder`) constructs a canonical, order-independent string identifier for a trading asset pair, suitable for use as Map/Set keys in order book tracking, ticker aggregation, or liquidity cache lookup.

## Overview

In decentralized exchange (DEX) order books and liquidity pools, a trading market between two assets (e.g. `XLM` and `USDC`) can be referenced symmetrically (`XLM/USDC` vs `USDC/XLM`).

`buildAssetPairKey` canonicalizes both assets:
- Native XLM is normalized to `"native"`.
- Credit assets are normalized to `"${CODE}:${ISSUER}"` with uppercase codes.
- Both assets are sorted lexicographically, producing identical keys regardless of order.

## Usage

```js
import { buildAssetPairKey, assetPairKeyBuilder, parseAssetPairKey } from "./assetPairKeyBuilder.js";

const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const usdc = `USDC:${issuer}`;

// Both produce "native/USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
console.log(buildAssetPairKey("native", usdc));
console.log(buildAssetPairKey(usdc, "native"));

// Supports object representations
console.log(buildAssetPairKey(
  { code: "USDC", issuer },
  { asset_type: "native" }
));

// Parse key back into assets
const [assetA, assetB] = parseAssetPairKey("native/USDC:GBBD...");
```

## API

### `buildAssetPairKey(assetAInput, [assetBInput])`

- **`assetAInput`**: First asset (string or object) or options object `{ base, counter }` / `{ assetA, assetB }`.
- **`assetBInput`**: Second asset (string or object).
- **Returns**: `string` — Canonical pair identifier (e.g. `"native/USDC:GA..."` or `"BTC:GA.../USDC:GA..."`).
- **Throws**:
  - `TypeError` if either asset is missing, invalid, or specifies an invalid issuer key or asset code.

### `parseAssetPairKey(canonicalKey)`

- **`canonicalKey`**: A string containing two assets joined by `"/"`.
- **Returns**: `[string, string]` — Tuple of the two canonical asset strings.
