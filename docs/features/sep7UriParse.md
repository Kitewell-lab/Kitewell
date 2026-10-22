# SEP-7 URI parser

`frontend/src/sep7UriParse.js` provides functions to parse Stellar SEP-0007 (`web+stellar:`) request URIs into a structured operation type (`pay` or `tx`) and query parameter map as a plain JavaScript object.

Reference: [SEP-0007: URI Scheme to facilitate delegated signing and payment requests](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md).

## Exported API

### `parseSep7Uri(uri)`

Parses a SEP-7 URI string and returns the parsed object. Throws a `Sep7ParseError` if the URI is malformed, uses an unsupported scheme, or specifies an unsupported operation.

```js
import { parseSep7Uri } from "./sep7UriParse";

// 1. Pay operation
const payResult = parseSep7Uri("web+stellar:pay?destination=GABC...&amount=100.5&asset_code=USDC");
// {
//   operation: 'pay',
//   params: {
//     destination: 'GABC...',
//     amount: '100.5',
//     asset_code: 'USDC'
//   },
//   raw: 'web+stellar:pay?destination=GABC...&amount=100.5&asset_code=USDC'
// }

// 2. Tx operation
const txResult = parseSep7Uri("web+stellar:tx?xdr=AAAAAGXqj8...&pubkey=GBBB...");
// {
//   operation: 'tx',
//   params: {
//     xdr: 'AAAAAGXqj8...',
//     pubkey: 'GBBB...'
//   },
//   raw: 'web+stellar:tx?xdr=AAAAAGXqj8...&pubkey=GBBB...'
// }
```

### `tryParseSep7Uri(uri)`

Safely attempts to parse a SEP-7 URI string, returning a typed result object `{ ok: true, data }` or `{ ok: false, error, code, details }` without throwing.

```js
import { tryParseSep7Uri } from "./sep7UriParse";

const result = tryParseSep7Uri("web+stellar:pay?destination=GABC");
if (result.ok) {
  console.log(result.data.operation, result.data.params);
} else {
  console.error(result.code, result.error);
}
```

### `isSep7Uri(uri)`

Convenience helper returning `true` if the input is a valid SEP-7 URI, or `false` otherwise.

### Error Handling

`Sep7ParseError` carries structured `.code` and `.details` fields:
- `INVALID_URI_TYPE`: Non-string input
- `EMPTY_URI`: Empty or whitespace-only string
- `INVALID_SCHEME`: Scheme is not `web+stellar` or lacks `:`
- `MISSING_OPERATION`: No operation specified
- `UNSUPPORTED_OPERATION`: Operation is neither `pay` nor `tx`
- `MALFORMED_URI_ENCODING`: Percent-decoding failure in parameter keys or values
