# Asset pair canonical key builder

`buildAssetPairKey` (also exported as `assetPairKeyBuilder`) builds a canonical, order-independent string key for a trading asset pair (e.g. `native/CODE:ISSUER`) suitable for use as a Map/Set key for order-book or ticker caching.

## Overview

In decentralized exchange (SDEX) and order-book operations, order books can be queried in either direction (`selling/buying` or `buying/selling`). Caches need a deterministic, order-independent key regardless of the orientation supplied by callers.

`buildAssetPairKey` normalizes both assets, validates format rules, sorts the canonical strings lexicographically, and joins them with `/`.

## Usage

```js
import {
  buildAssetPairKey,
  parseAssetPairKey,
  CANONICAL_NATIVE_ASSET,
  ASSET_PAIR_SEPARATOR,
} from "./assetPairKeyBuilder.js";

const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// Order-independent:
const key1 = buildAssetPairKey("native", `USDC:${issuer}`);
const key2 = buildAssetPairKey(`USDC:${issuer}`, "native");
console.log(key1 === key2); // true: "native/USDC:GBBD..."

// Options object parameter:
const key3 = buildAssetPairKey({
  base: { type: "native" },
  counter: { code: "USDC", issuer },
});

// Decompose a key:
const [asset1, asset2] = parseAssetPairKey(key1);
```

## API

### `buildAssetPairKey(assetAInput, [assetBInput])`

- **`assetAInput`**: First asset representation or options object (`{ assetA, assetB }`, `{ base, counter }`, or `{ selling, buying }`).
- **`assetBInput`**: Second asset representation (string or object).
- **Returns**: `string` (canonical pair key, e.g. `native/USDC:GB...`).
- **Throws**: `TypeError` if an asset is missing or has an invalid code/issuer format.

### Constants

`backend/src/assetPairKeyBuilderConstants.js` exports:
- `CANONICAL_NATIVE_ASSET`: `"native"`
- `ASSET_PAIR_SEPARATOR`: `"/"`
- `ASSET_PAIR_KEY_ERROR`: Error string fragments.
