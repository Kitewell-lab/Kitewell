# stellar.toml fields parser

`backend/src/stellarTomlFieldsParse.js` parses a SEP-1 `stellar.toml` file's raw
text content (passed in as a string, with no network fetch) and extracts known
top-level fields into a plain object, ignoring unknown keys and table sections.

This module is standalone — it does not import `@stellar/stellar-sdk`, call
Horizon, or wire into `app.js` / `index.js`.

## Extracted top-level fields

`KNOWN_STELLAR_TOML_FIELDS`:

- `NETWORK_PASSPHRASE`
- `FEDERATION_SERVER`
- `AUTH_SERVER`
- `SIGNING_KEY`
- `HORIZON_URL`

## Rules

1. Input must be a `string` of at most `102,400` UTF-8 bytes (SEP-1 size limit).
2. Blank lines and `#` comments are skipped.
3. Unknown top-level keys (e.g. `VERSION`, `ACCOUNTS`, `TRANSFER_SERVER`) are
   ignored.
4. Once a `[TABLE]` or `[[ARRAY_OF_TABLES]]` header is encountered, subsequent
   keys belong to that table section and are not extracted as top-level fields.
5. Known top-level field values must be quoted TOML strings (`"..."` or `'...'`).
   Duplicate top-level keys, malformed lines, or unclosed quotes throw an `Error`.

## Public API

```js
import {
  parseStellarTomlFields,
  tryParseStellarTomlFields,
} from "./stellarTomlFieldsParse.js";

parseStellarTomlFields(`
  NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
  HORIZON_URL = "https://horizon-testnet.stellar.org"
  VERSION = "2.5.0"
`);
// => {
//   NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
//   HORIZON_URL: "https://horizon-testnet.stellar.org",
// }

tryParseStellarTomlFields(null);
// => { ok: false, error: "stellar.toml content must be a string" }
```

## Tests

`npm test` from `backend/` runs the `node:test` suites:

- `stellarTomlFieldsParse-happy.test.js`
- `stellarTomlFieldsParse-unknown-keys.test.js`
- `stellarTomlFieldsParse-comments-blank.test.js`
- `stellarTomlFieldsParse-sections.test.js`
- `stellarTomlFieldsParse-boundary.test.js`
- `stellarTomlFieldsParse-invalid-input.test.js`
- `stellarTomlFieldsParse-syntax-error.test.js`
- `stellarTomlFieldsParse-try-immutable.test.js`
