# Claimable balance predicate describer

`frontend/src/claimPredicateDescribe.js` converts a Stellar claimable balance claimant predicate object into a short, human-readable description string for display, without evaluating or mutating the predicate. The module is standalone; wallet and UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Converts primitive predicates (`unconditional`, `relBefore`, `absBefore`) and composite boolean logic trees (`and`, `or`, `not`) into readable text descriptions.
- Supports Horizon API and Stellar SDK predicate tree representations (supporting both camelCase and snake_case property aliases).
- Formats relative time durations (in seconds) into creation-relative statements.
- Formats absolute time bounds (ISO-8601 strings, UNIX epoch seconds, and `Date` instances) cleanly.
- Provides recursion protection against malformed circular or excessively deep structures via configurable `maxDepth`.
- Validates predicate objects and provides strict error throwing or configurable safe fallback output.

## Public API

### `claimPredicateDescribe(predicate, options)`

Converts a claimant predicate object into a readable display string.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `predicate` | `Object` | — | Stellar claimant predicate object tree |
| `options.throwOnError` | `boolean` | `true` | When `true`, throws errors for invalid shapes; when `false`, returns `options.fallback` |
| `options.fallback` | `string` | `"Invalid predicate"` | String returned when validation fails and `throwOnError` is `false` |
| `options.maxDepth` | `number` | `20` | Maximum allowed tree recursion depth |

```js
import { claimPredicateDescribe } from "./claimPredicateDescribe.js";

claimPredicateDescribe({ unconditional: true });
// => "Unconditional"

claimPredicateDescribe({ relBefore: 3600 });
// => "Within 3600 seconds of creation"

claimPredicateDescribe({
  and: [
    { relBefore: 3600 },
    { absBefore: "2026-12-31T23:59:59.000Z" }
  ]
});
// => "(Within 3600 seconds of creation and Before 2026-12-31T23:59:59.000Z)"
```

### `getPredicateType(predicate)`

Returns the string type of a predicate node: `"unconditional"`, `"relBefore"`, `"absBefore"`, `"and"`, `"or"`, `"not"`, or `"unknown"`.

### `isPredicate(predicate)`

Returns `true` if the candidate is a valid and recognizable predicate object structure.

### `formatRelBefore(seconds)`

Formats a relative seconds bound into a duration string.

### `formatAbsBefore(target)`

Formats an absolute date, UNIX epoch timestamp, or ISO string into an absolute bound string.

### `ClaimPredicateDescribeError`

Custom error class thrown when predicate shape or values are invalid.

## Notes

- Tests live alongside the module under `frontend/src/claimPredicateDescribe-*.test.js` and run with `npm test` from `frontend/`.
- No existing files or components are modified.
