# `memoBuilder`

Builds and validates Stellar memos (text / id / hash) without the SDK.
Pure and local — every function returns a typed result instead of throwing.

## Result shape

Valid: `{ ok: true, value: { type, value } }`
Invalid: `{ ok: false, error: { code, message } }`

## Public API

`buildTextMemo(text)` — text memo with a UTF-8 byte length of at most 28.
Error codes: `INVALID_TYPE`, `EMPTY_MEMO`, `TOO_LONG`.

`buildIdMemo(id)` — unsigned 64-bit integer memo. Accepts a non-negative
safe integer, a decimal digit string, or a bigint; the value is normalized
to a decimal string. Error codes: `INVALID_TYPE`, `INVALID_ID`, `OUT_OF_RANGE`.

`buildHashMemo(hex)` — 32-byte hash memo given as 64 hex characters;
uppercase input is normalized to lowercase.
Error codes: `INVALID_TYPE`, `INVALID_HASH`.
