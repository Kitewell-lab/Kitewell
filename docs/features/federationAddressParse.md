# Federation address parser

`frontend/src/federationAddressParse.js` parses and validates Stellar SEP-2
federation addresses (`name*domain.com`) into `{ name, domain }`.

This module is standalone — it does not perform network requests, import
`@stellar/stellar-sdk`, or wire into `App.jsx`, `freighter.js`, or `stellar.js`.

## Validation rules

1. `address` must be a `string` (surrounding whitespace is trimmed).
2. Exactly one `*` separator must be present.
3. `name` (before `*`) must be non-empty, at most `256` characters, and free of
   whitespace, ASCII control characters, and SEP-2 forbidden characters
   (`<`, `>`, `,`, `*`).
4. `domain` (after `*`) must be a valid multi-label DNS domain (`<= 253`
   characters, `1`–`63` characters per label, alphabetic TLD) and is normalized
   to lowercase.

## Public API

```js
import {
  formatFederationAddress,
  isValidFederationAddress,
  parseFederationAddress,
  tryParseFederationAddress,
} from "./federationAddressParse.js";

parseFederationAddress("alice*Example.COM");
// => { name: "alice", domain: "example.com" }

tryParseFederationAddress("invalid");
// => { ok: false, error: 'Federation address must contain a "*" separator.' }

isValidFederationAddress("bob*stellar.org"); // => true
formatFederationAddress("bob", "Stellar.ORG"); // => "bob*stellar.org"
```

## Tests

`npm test` (Vitest) from `frontend/` runs:

- `federationAddressParse-happy.test.js`
- `federationAddressParse-separator.test.js`
- `federationAddressParse-empty-parts.test.js`
- `federationAddressParse-domain.test.js`
- `federationAddressParse-boundary.test.js`
- `federationAddressParse-invalid-input.test.js`
- `federationAddressParse-predicate-try.test.js`
- `federationAddressParse-format.test.js`
