# Ledger close time relative formatter

`frontend/src/ledgerCloseTimeFormat.js` formats a Stellar ledger's ISO-8601 `closed_at` timestamp into a concise relative time string (e.g., `"5s ago"`, `"3m ago"`, `"2h ago"`, `"1d ago"`).

The module is standalone; UI integration (`App.jsx`, `freighter.js`, `stellar.js`) is out of scope.

## What it does

- Parses ISO-8601 strings, `Date` objects, and millisecond timestamps.
- Formats elapsed time into clean, compact units:
  - `< 60s`: `${seconds}s ago`
  - `< 60m`: `${minutes}m ago`
  - `< 24h`: `${hours}h ago`
  - `>= 24h`: `${days}d ago`
- Supports an injectable `now` timestamp (Date, string, number, or options object) for deterministic unit testing without timers or clock mocking.
- Handles timestamps slightly in the future (e.g. slight clock skew) by returning `"just now"`.
- Provides `tryFormatLedgerCloseTime` for safe formatting without throwing.
- Throws typed `InvalidLedgerTimeError` for unparseable dates or non-date inputs.

## Public API

### `formatLedgerCloseTime(closedAt, optionsOrNow)`

Formats a ledger `closed_at` timestamp into a relative string.

```js
import { formatLedgerCloseTime } from "./ledgerCloseTimeFormat";

const closedAt = "2026-10-22T12:00:00.000Z";

// Using explicit injected now
formatLedgerCloseTime(closedAt, "2026-10-22T12:00:05.000Z"); // "5s ago"
formatLedgerCloseTime(closedAt, "2026-10-22T12:03:00.000Z"); // "3m ago"
formatLedgerCloseTime(closedAt, "2026-10-22T14:00:00.000Z"); // "2h ago"
formatLedgerCloseTime(closedAt, "2026-10-23T12:00:00.000Z"); // "1d ago"

// Using options object
formatLedgerCloseTime(closedAt, {
  now: "2026-10-22T12:05:00.000Z",
  futureFallback: "upcoming"
});
```

### `isValidLedgerCloseTime(value)`

Returns `true` if `value` can be parsed into a valid timestamp, `false` otherwise.

```js
import { isValidLedgerCloseTime } from "./ledgerCloseTimeFormat";

isValidLedgerCloseTime("2026-10-22T12:00:00Z"); // true
isValidLedgerCloseTime("not-a-date");            // false
```

### `tryFormatLedgerCloseTime(closedAt, optionsOrNow, fallback)`

Safely attempts to format `closedAt`, returning `fallback` (default `null`) on failure.

```js
import { tryFormatLedgerCloseTime } from "./ledgerCloseTimeFormat";

tryFormatLedgerCloseTime("invalid", undefined, "--"); // "--"
```
