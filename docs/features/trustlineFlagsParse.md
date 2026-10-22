# `trustlineFlagsParse`

`backend/src/trustlineFlagsParse.js` is a standalone backend utility to parse and decode Stellar Horizon trustline bitmask flags into structured boolean capabilities.

## Background

Under the Stellar protocol, trustlines can have permission flags set by an asset issuer:
- `1` (`0x1`) - `AUTHORIZED_FLAG`: The account is authorized to hold the asset and perform transactions.
- `2` (`0x2`) - `AUTHORIZED_TO_MAINTAIN_LIABILITIES_FLAG`: The account is authorized to maintain liabilities (such as existing orders) but cannot make new transactions.
- `4` (`0x4`) - `CLAWBACK_ENABLED_FLAG`: The issuer has enabled clawback capabilities on the trustline.

## API Reference

### `parseTrustlineFlags(input)`

Parses a raw numeric bitmask, a stringified integer, or an object `{ flags: ... }`.

Returns an object:
```javascript
{
  raw: number,
  authorized: boolean,
  authorizedToMaintainLiabilities: boolean,
  clawbackEnabled: boolean,
  hasAnyFlag: boolean
}
```

Throws a `TypeError` if input cannot be parsed as a valid non-negative integer.

### `tryParseTrustlineFlags(input, fallback = null)`

Safely parses trustline flags without throwing, returning `fallback` upon error.

### `isValidTrustlineFlags(input)`

Returns `true` if `input` is valid trustline flags format, otherwise `false`.

### `serializeTrustlineFlags(flagsObj)`

Converts `{ authorized, authorizedToMaintainLiabilities, clawbackEnabled }` boolean object back to numeric bitmask.
