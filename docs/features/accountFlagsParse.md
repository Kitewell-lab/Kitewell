# Account flags bitmask parser

`backend/src/accountFlagsParse.js` parses a Stellar account's numeric flags bitmask into a structured object representing the documented protocol flag states.

The module is standalone; backend route integration is out of scope.

## What it does

- Parses an account's flags bitmask into four named boolean flags:
  - `authRequired` (`0x1`): requires issuer approval for new trustlines.
  - `authRevocable` (`0x2`): allows issuer to revoke existing trustlines.
  - `authImmutable` (`0x4`): prevents issuer from altering authorization flags.
  - `authClawbackEnabled` (`0x8`): enables clawback of asset balances.
- Accepts `number`, decimal `string`, hex `string` (`0x...`), and `bigint` inputs.
- Preserves raw input bitmask value in `raw`.
- Provides inverse `buildAccountFlagsBitmask(flags)` for generating flags bitmasks.
- Guards against negative numbers, floats, null, and non-numeric strings.
- Throws typed `InvalidAccountFlagsError` for invalid inputs.

## Public API

### `STELLAR_ACCOUNT_FLAGS`

Constant mapping of Stellar account flag bitmask constants:

```js
import { STELLAR_ACCOUNT_FLAGS } from "./accountFlagsParse.js";

// { AUTH_REQUIRED: 1, AUTH_REVOCABLE: 2, AUTH_IMMUTABLE: 4, AUTH_CLAWBACK_ENABLED: 8 }
```

### `parseAccountFlags(flagsBitmask)`

Parses a numeric or string bitmask into named boolean properties.

```js
import { parseAccountFlags } from "./accountFlagsParse.js";

parseAccountFlags(3);
// => { authRequired: true, authRevocable: true, authImmutable: false, authClawbackEnabled: false, raw: 3 }

parseAccountFlags(0);
// => { authRequired: false, authRevocable: false, authImmutable: false, authClawbackEnabled: false, raw: 0 }
```

### `buildAccountFlagsBitmask(flags)`

Constructs an integer bitmask from named flags.

```js
import { buildAccountFlagsBitmask } from "./accountFlagsParse.js";

buildAccountFlagsBitmask({ authRequired: true, authClawbackEnabled: true });
// => 9
```

### `isValidAccountFlags(value)`

Returns `true` if `value` represents a valid non-negative integer flags bitmask, `false` otherwise.

```js
import { isValidAccountFlags } from "./accountFlagsParse.js";

isValidAccountFlags(15);   // true
isValidAccountFlags(-1);   // false
isValidAccountFlags("xyz");// false
```
