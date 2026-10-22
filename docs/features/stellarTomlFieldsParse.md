# stellar.toml fields parser

`backend/src/stellarTomlFieldsParse.js` parses a raw string representing a `stellar.toml` file (SEP-0001) and extracts known top-level fields into a plain JavaScript object while ignoring comments, sub-tables, and unknown keys.

## Extracted Top-Level Fields

By default, the following SEP-0001 top-level fields are extracted:
- `NETWORK_PASSPHRASE`
- `FEDERATION_SERVER`
- `AUTH_SERVER`
- `SIGNING_KEY`
- `HORIZON_URL`

Sub-tables (e.g. `[DOCUMENTATION]`, `[[CURRENCIES]]`) and unlisted fields are safely ignored.

## Exported API

### `parseStellarTomlFields(rawContent, options)`

Parses the raw content and returns an object containing the extracted fields. Throws `StellarTomlParseError` if `rawContent` is not a string.

```js
import { parseStellarTomlFields } from "../../backend/src/stellarTomlFieldsParse.js";

const tomlContent = `
NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015"
HORIZON_URL = "https://horizon.stellar.org"
VERSION = "2.0.0" # ignored
`;

const fields = parseStellarTomlFields(tomlContent);
// {
//   NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
//   HORIZON_URL: "https://horizon.stellar.org"
// }
```

### `checkStellarTomlFields(rawContent, options)`

Non-throwing alternative returning `{ ok: true, fields, fieldCount }` or `{ ok: false, error, code, details }`.

### `isStellarTomlFieldsParseable(rawContent, options)`

Returns a boolean indicating whether the input can be parsed.

### Options

- `allowedFields` (string[], default: `KNOWN_TOP_LEVEL_FIELDS`): Customizable array of top-level field names to extract.

### Constants

- `KNOWN_TOP_LEVEL_FIELDS`: List of default SEP-0001 top-level field names.
