# Stellar federation address parser

`frontend/src/federationAddressParse.js` provides functions to parse a Stellar SEP-0002 federation address string (`name*domain.com`) into its constituent `name` and `domain` components.

Reference: [SEP-0002: Federation Protocol](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md).

## Exported API

### `parseFederationAddress(address, options)`

Parses a federation address string. Throws `FederationAddressParseError` if the address does not contain exactly one `*` separator or if either the name or domain component is empty.

```js
import { parseFederationAddress } from "./federationAddressParse";

const { name, domain } = parseFederationAddress("jed*stellar.org");
console.log(name);   // "jed"
console.log(domain); // "stellar.org"
```

#### Options

- `trim` (boolean, default: `true`): Whether leading/trailing whitespace is stripped prior to parsing.

### `tryParseFederationAddress(address, options)`

Non-throwing alternative that returns `{ ok: true, data: { name, domain, raw } }` or `{ ok: false, error, code, details }`.

```js
import { tryParseFederationAddress } from "./federationAddressParse";

const result = tryParseFederationAddress("alice*stellar.org");
if (result.ok) {
  console.log(result.data.name, result.data.domain);
} else {
  console.error(result.code, result.error);
}
```

### `isFederationAddress(address, options)`

Returns `true` if the input is a valid federation address, `false` otherwise.

### Error Codes

`FederationAddressParseError` provides machine-readable error codes:
- `INVALID_ADDRESS_TYPE`: Input is not a string
- `EMPTY_ADDRESS`: Address is empty or whitespace-only
- `MISSING_SEPARATOR`: No `*` separator present
- `MULTIPLE_SEPARATORS`: More than one `*` separator present
- `EMPTY_NAME`: Name portion before `*` is empty
- `EMPTY_DOMAIN`: Domain portion after `*` is empty
