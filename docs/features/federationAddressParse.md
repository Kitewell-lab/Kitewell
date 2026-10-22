# federationAddressParse

`federationAddressParse` is a frontend helper module for parsing Stellar SEP-0002 federation addresses (`name*domain.com`) into distinct `name` and `domain` components.

## Capabilities

- Validates that exactly one asterisk (`*`) is present as separator.
- Ensures neither the username nor domain part is empty.
- Automatically normalizes domains to lowercase by default.
- Provides options for custom casing handling (`lowercaseName`, `lowercaseDomain`).
- Includes safe non-throwing parser (`tryParseFederationAddress`) and validator (`isValidFederationAddress`).

## Public API

### `parseFederationAddress(address, options)`

Parses a federation address string into `{ name, domain, raw }`.

- **Parameters**:
  - `address` (`string`): Federation address string.
  - `options` (`Object`, optional):
    - `trim` (`boolean`, default: `true`): Trim outer whitespace.
    - `lowercaseDomain` (`boolean`, default: `true`): Convert domain to lowercase.
    - `lowercaseName` (`boolean`, default: `false`): Convert username to lowercase.
    - `validateDomain` (`boolean`, default: `false`): Validate domain formatting.
- **Returns**: `{ name: string, domain: string, raw: string }`
- **Throws**: `InvalidFederationAddressError` on invalid syntax.

### `isValidFederationAddress(address, options)`

Returns `true` if valid federation address, `false` otherwise.

### `tryParseFederationAddress(address, options, fallback = null)`

Safe wrapper returning `fallback` on invalid inputs instead of throwing.

### `InvalidFederationAddressError`

Error subclass thrown when federation address format is invalid.
