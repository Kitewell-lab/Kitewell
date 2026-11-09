# SEP-7 URI parser

`frontend/src/sep7UriParse.js` parses a Stellar SEP-7 (`web+stellar:`) request
URI string into its operation type (`"pay"` or `"tx"`) and query parameters as a
plain object, without performing any signing, transaction building, or network
calls.

This module is standalone — it is not imported into `App.jsx`, `freighter.js`,
or `stellar.js`.

## Validation rules

1. `uri` must be a `string` (surrounding whitespace is trimmed) of at most
   `8,192` characters.
2. The URI must start with `web+stellar:` (case-insensitive) and must not use
   an authority prefix (`//`).
3. The operation immediately following `web+stellar:` must be `"pay"` or `"tx"`
   (normalized to lowercase).
4. Query parameters after `?` are percent-decoded into a plain object. Duplicate
   keys, empty keys, or invalid percent-encodings throw an `Error`.

## Public API

```js
import {
  isValidSep7Uri,
  parseSep7Uri,
  tryParseSep7Uri,
} from "./sep7UriParse.js";

parseSep7Uri("web+stellar:pay?destination=GABC&amount=10");
// => { operation: "pay", params: { destination: "GABC", amount: "10" } }

parseSep7Uri("web+stellar:tx?xdr=AAAAAgAAAABex3%2B%3D");
// => { operation: "tx", params: { xdr: "AAAAAgAAAABex3+=" } }

tryParseSep7Uri("https://example.com");
// => { ok: false, error: 'SEP-7 URI must start with "web+stellar:".' }

isValidSep7Uri("web+stellar:pay?destination=GABC"); // => true
```

## Tests

`npm test` (Vitest) from `frontend/` runs:

- `sep7UriParse-pay-happy.test.js`
- `sep7UriParse-tx-happy.test.js`
- `sep7UriParse-encoding.test.js`
- `sep7UriParse-scheme.test.js`
- `sep7UriParse-operation.test.js`
- `sep7UriParse-boundary.test.js`
- `sep7UriParse-invalid-input.test.js`
- `sep7UriParse-helpers-immutable.test.js`
