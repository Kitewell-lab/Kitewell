# `logRedact`

Redacts sensitive field names from objects before they are written to
structured log lines. Pure and local, no I/O.

## Public API

`redactLogObject(input, customKeys?): unknown`

- Default list covers: secret, seed, password, authorization, token, key,
  privatekey, passphrase (case-insensitive).
- Sensitive values are replaced with `"[REDACTED]"`.
- Recurses into nested objects and arrays.
- A non-empty `customKeys` array overrides the default list; an empty or
  omitted list falls back to the defaults.
- Non-object input is returned unchanged.
