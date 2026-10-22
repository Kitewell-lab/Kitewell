# Asset issuer display formatter

`frontend/src/assetIssuerDomainFormat.js` formats an asset's code, issuer address, and (optional) home domain into a single compact display string for user interface lists and tables.

## Display Formatting Rules

1. **Native Asset**: Displays `"XLM"` (or a configured `nativeLabel`) for native Stellar assets.
2. **Domain Priority**: When a non-empty home domain is available, formats as `${code} (${domain})` (e.g. `"USDC (centre.io)"`).
3. **Shortened Issuer Fallback**: When no domain is known, truncates the issuer address to `${code} (${prefix}…${suffix})` (e.g. `"USDC (GA5Z…KZVN)"`).

## Exported API

### `formatAssetIssuerDomain(inputOrCode, maybeIssuer, maybeDomain, maybeOptions)`

Formats an asset for display, accepting either an object or positional arguments:

```js
import { formatAssetIssuerDomain } from "./assetIssuerDomainFormat";

// 1. Positional arguments with domain
formatAssetIssuerDomain("USDC", "GA5Z...", "centre.io");
// "USDC (centre.io)"

// 2. Object argument without domain (falls back to shortened issuer)
formatAssetIssuerDomain({
  code: "USDC",
  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
});
// "USDC (GA5Z…KZVN)"

// 3. Native asset
formatAssetIssuerDomain("XLM");
// "XLM"

// 4. Custom shortening options
formatAssetIssuerDomain("USDC", "GA5Z...", null, { prefixLength: 6, suffixLength: 6 });
// "USDC (GA5ZSE…4KZVN)"
```

### `checkAssetIssuerDomain(...)`

Non-throwing inspector returning `{ ok: true, display, isNative, hasDomain }` or `{ ok: false, error, code, details }`.

### `isFormattableAsset(...)`

Returns a boolean indicating whether the asset can be formatted.

### Options

- `prefixLength` (number, default: `4`): Kept characters from issuer start.
- `suffixLength` (number, default: `4`): Kept characters from issuer end.
- `ellipsis` (string, default: `'…'`): Separator placed between shortened address parts.
- `nativeLabel` (string, default: `'XLM'`): Label used for native assets.
