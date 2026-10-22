# stellarTomlFieldsParse

`stellarTomlFieldsParse` is a backend parser that extracts standard top-level fields from raw `stellar.toml` text content (without making network requests).

## Capabilities

- Parses key-value pairs formatted as `KEY = "value"` or `KEY = 'value'`.
- Extracts standard top-level SEP-0001 fields:
  - `NETWORK_PASSPHRASE`
  - `FEDERATION_SERVER`
  - `AUTH_SERVER`
  - `SIGNING_KEY`
  - `HORIZON_URL`
- Ignores full-line and inline comments (`#`), empty lines, and unknown keys.
- Isolates top-level fields from sub-tables (e.g. `[[CURRENCIES]]` or `[DOCUMENTATION]`).
- Exposes `tryParseStellarTomlFields` safe fallback wrapper and `isValidStellarToml` validator.

## Public API

### `parseStellarTomlFields(tomlText, options)`

Extracts known top-level fields into a dictionary.

- **Parameters**:
  - `tomlText` (`string`): Raw content of `stellar.toml`.
  - `options` (`Object`, optional):
    - `fields` (`string[]`, default: `KNOWN_STELLAR_TOML_FIELDS`): Keys to extract.
    - `onlyTopLevel` (`boolean`, default: `true`): Ignore fields defined under table headers.
- **Returns**: `Record<string, string>`
- **Throws**: `InvalidStellarTomlError` if input is not a string.

### `isValidStellarToml(tomlText, options)`

Returns `true` if input is a valid string that can be parsed, `false` otherwise.

### `tryParseStellarTomlFields(tomlText, options, fallback = {})`

Safe wrapper returning `fallback` instead of throwing on invalid input.

### `KNOWN_STELLAR_TOML_FIELDS`

Exported constant array of standard keys.

### `InvalidStellarTomlError`

Custom Error class thrown on non-string input.
