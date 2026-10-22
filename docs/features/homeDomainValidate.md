# Home domain string validator

`backend/src/homeDomainValidate.js` validates a Stellar account `home_domain` string according to protocol constraints.

The module is standalone; backend route integration is out of scope.

## What it does

- Enforces the Stellar protocol constraint: max 32 bytes (UTF-8).
- Validates basic domain-name structure (alphanumeric labels separated by dots).
- Rejects URI schemes (e.g. `https://`, `http://`).
- Rejects URL paths (e.g. `example.com/foo`).
- Rejects port numbers (e.g. `example.com:8080`).
- Rejects non-ASCII characters, control characters, and whitespace.
- Rejects leading/trailing hyphens on labels and leading/trailing/consecutive dots.
- Throws typed `InvalidHomeDomainError` with actionable error context.

## Public API

### `validateHomeDomain(domain)`

Validates `domain` and returns it if valid. Throws `InvalidHomeDomainError` otherwise.

```js
import { validateHomeDomain } from "./homeDomainValidate.js";

validateHomeDomain("stellar.org");
// => "stellar.org"

validateHomeDomain("https://stellar.org");
// Throws InvalidHomeDomainError: home_domain must not include a URL scheme
```

### `isValidHomeDomain(domain)`

Returns `true` if `domain` is a valid Stellar home_domain, `false` otherwise without throwing.

```js
import { isValidHomeDomain } from "./homeDomainValidate.js";

isValidHomeDomain("example.com");        // true
isValidHomeDomain("example.com:8080");   // false (port not allowed)
isValidHomeDomain("example.com/account");// false (path not allowed)
isValidHomeDomain("例子.com");           // false (non-ASCII not allowed)
```
