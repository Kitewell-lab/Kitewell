# `assetKey`

Builds a stable string key for a Horizon/Stellar asset — the same shape the
backend uses — for Map/Set keys and de-duplicating balances.

## Public API

`buildAssetKey(asset): string|null`
- `{ asset_type: "native" }` → `"native"`
- `{ asset_type: "credit_alphanum4"|"credit_alphanum12", asset_code, asset_issuer }` → `"CODE:ISSUER"` (exact spelling preserved)
- Malformed input → `null`

`isNativeAssetKey(key): boolean` — true only for the exact string `"native"`.

`splitAssetKey(key)` — inverse of `buildAssetKey`:
- `"native"` → `{ type: "native" }`
- `"CODE:ISSUER"` → `{ type: "issued", code, issuer }`
- malformed → `null`
