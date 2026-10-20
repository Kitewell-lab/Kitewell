# `addressShorten`

Shortens a Stellar `G...` address to a compact display form such as
`GBBD...FLA5`. Pure string operation, no network call.

## Public API

`shortenAddress(value, prefixLength = 4, suffixLength = 4): string`

## Contract

- Returns `<prefix>...<suffix>` using the requested side lengths.
- If the requested sides do not fit (`value.length < prefix + suffix + 1`),
  the address is returned **unchanged**, so no information is ever lost.
- Non-finite side lengths fall back to a one-character minimum.
- Non-string input is returned as-is.
