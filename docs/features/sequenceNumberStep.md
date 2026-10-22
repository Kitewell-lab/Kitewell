# Account sequence number stepper

`backend/src/sequenceNumberStep.js` provides safe BigInt increment and decrement helpers for Stellar account sequence numbers passed as decimal strings.

The module is standalone; backend route integration is out of scope.

## What it does

- Validates and parses sequence numbers as non-negative decimal strings, preventing non-numeric and floating-point inputs.
- Provides precision-safe BigInt arithmetic that handles values beyond standard JavaScript IEEE-754 53-bit integers without truncation or precision loss.
- Guards against negative sequence numbers on decrement or negative stepping operations.
- Returns normalized decimal strings suitable for Stellar transaction envelopes and Horizon APIs.
- Throws typed `InvalidSequenceNumberError` with detailed context when inputs or arithmetic results are invalid.

## Public API

### `isValidSequenceNumber(value)`

Returns `true` if `value` is a valid sequence number (non-negative integer decimal string, number, or BigInt), `false` otherwise.

```js
import { isValidSequenceNumber } from "./sequenceNumberStep.js";

isValidSequenceNumber("100"); // true
isValidSequenceNumber("-5");  // false
isValidSequenceNumber("abc"); // false
```

### `incrementSequence(sequence, delta)`

Increments `sequence` by `delta` (default `1n`).

```js
import { incrementSequence } from "./sequenceNumberStep.js";

incrementSequence("100");
// => "101"

incrementSequence("100", 5);
// => "105"

incrementSequence("9223372036854775807", 1);
// => "9223372036854775808"
```

### `decrementSequence(sequence, delta)`

Decrements `sequence` by `delta` (default `1n`). Throws `InvalidSequenceNumberError` if the result would be negative.

```js
import { decrementSequence } from "./sequenceNumberStep.js";

decrementSequence("100");
// => "99"

decrementSequence("0", 1);
// Throws InvalidSequenceNumberError: Sequence number cannot be negative
```

### `stepSequenceNumber(sequence, step)`

Applies a signed step to `sequence`.

```js
import { stepSequenceNumber } from "./sequenceNumberStep.js";

stepSequenceNumber("100", 10);  // "110"
stepSequenceNumber("100", -10); // "90"
```
