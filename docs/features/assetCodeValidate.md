# `assetCodeValidate`

Validates Stellar asset code strings (length 1-12, alphanumeric) without
requiring the Horizon SDK. Pure and local.

## Public API

`isValidAssetCode(value): boolean`
True when `value` is a string of 1-12 alphanumeric characters (`a-z`, `A-Z`,
`0-9`). Rejects empty strings, symbols, spaces, and non-string input. Case
insensitive: `usdc` and `USDC` are both valid.

`isNativeAssetCode(value): boolean`
True when `value` is `"XLM"` or `"native"` (case-insensitive); `false`
otherwise, including `null` and non-strings.
