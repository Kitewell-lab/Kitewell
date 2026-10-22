# sep7UriParse

`sep7UriParse` is a frontend utility that parses Stellar SEP-0007 URI request strings (`web+stellar:...`) into structured operation types and query parameter dictionaries.

## Capabilities

- Parses both standard `pay` and `tx` operations according to SEP-0007 specifications.
- Tolerates case variations in scheme prefixes (`web+stellar:`, `WEB+STELLAR:`).
- Tolerates double slash format (`web+stellar://pay?...`).
- Decodes URL-encoded query parameters into plain JavaScript objects.
- Does not trigger or depend on any wallet signing, submission, or network calls.
- Provides a safe non-throwing wrapper (`tryParseSep7Uri`) with customizable fallback.

## Public API

### `parseSep7Uri(uri, options)`

Parses a `web+stellar:` URI string.

- **Parameters**:
  - `uri` (`string`): Raw SEP-7 URI string.
  - `options` (`Object`, optional):
    - `allowedOperations` (`string[]`, default: `['pay', 'tx']`): Array of permitted operation types.
    - `trim` (`boolean`, default: `true`): Trim whitespace before parsing.
- **Returns**: `{ operation: string, params: Record<string, string>, rawUri: string }`
- **Throws**: `InvalidSep7UriError` on malformed URIs, wrong schemes, or disallowed operation types.

### `isValidSep7Uri(uri, options)`

Returns `true` if parsing succeeds without throwing, `false` otherwise.

### `tryParseSep7Uri(uri, options, fallback = null)`

Safe parser returning `fallback` instead of throwing on invalid inputs.

### `SEP7_SCHEME` & `SUPPORTED_OPERATIONS`

Exported constants (`'web+stellar:'`, `['pay', 'tx']`).

### `InvalidSep7UriError`

Custom error subclass thrown when input validation fails.
