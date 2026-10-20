# `addressValidate`

Stellar public-key format validation for the Kitewell backend. Pure and
local — no Horizon or RPC call is made.

## What it does

Checks that a value looks like a Stellar `G...` public key: length 56, a
leading `G`, and an uppercase base32 body (`A-Z`, `2-7`).

## Public API

### `hasPublicKeyLength(value): boolean`
True when `value` is a string of exactly 56 characters.

### `isBase32(value): boolean`
True when every character of `value` is in the uppercase base32 alphabet.

### `isValidPublicKey(value): boolean`
Full format check. Returns `false` for anything that fails length, the `G`
prefix, or the base32 charset — including `null`, `undefined`, empty strings
and lowercase keys.

## Usage

```js
import { isValidPublicKey } from "./addressValidate.js";

isValidPublicKey("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"); // true
isValidPublicKey(""); // false
```
