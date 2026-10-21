# `errorResponseShape`

Standardized JSON error response formatter for the Kitewell backend API.

## Public API

### `formatErrorResponse(code, message)`
Returns `{ error: { code, message } }`. Falls back to defaults when parameters are missing or empty.

### `isErrorResponse(value)`
Returns `true` if `value` has `{ error: { code: string, message: string } }`.
